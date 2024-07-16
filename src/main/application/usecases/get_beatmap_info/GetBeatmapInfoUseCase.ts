import {UseCase} from '../UseCase';
import {GetBeatmapInfoRequest} from './GetBeatmapInfoRequest';
import {GetBeatmapInfoResponse} from './GetBeatmapInfoResponse';
import {OsuBeatmapsDao} from '../../requirements/dao/OsuBeatmapsDao';
import {BeatmapInfoAdapter} from '../../adapters/beatmap_info/BeatmapInfoAdapter';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Mod, UnremarkableMod} from '../../../domain/entities/mods/Mod';
import {ModeOsu} from '../../../domain/entities/mode/ModeOsu';
import {DoubleTime} from '../../../domain/entities/mods/osu/DoubleTime';
import {DifficultyAdjust} from '../../../domain/entities/mods/osu/DifficultyAdjust';
import {HalfTime} from '../../../domain/entities/mods/osu/HalfTime';
import {Daycore} from '../../../domain/entities/mods/osu/Daycore';
import {Nightcore} from '../../../domain/entities/mods/osu/Nighcore';
import {Easy} from '../../../domain/entities/mods/osu/Easy';
import {HardRock} from '../../../domain/entities/mods/osu/HardRock';
import {HitcountsOsu} from '../../../domain/entities/hitcounts/HitcountsOsu';
import {ScoreSimEstimationProviderOsu} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderOsu';
import {BeatmapScore} from '../../../domain/entities/BeatmapScore';

export class GetBeatmapInfoUseCase
  implements UseCase<GetBeatmapInfoRequest, GetBeatmapInfoResponse>
{
  beatmaps: OsuBeatmapsDao;
  scoreSimulations: ScoreSimulationsDao;
  beatmapInfoAdapter: BeatmapInfoAdapter;
  constructor(osuUsers: OsuBeatmapsDao, scoreSimulations: ScoreSimulationsDao) {
    this.beatmaps = osuUsers;
    this.scoreSimulations = scoreSimulations;
    this.beatmapInfoAdapter = new BeatmapInfoAdapter(scoreSimulations);
  }

  async execute(
    params: GetBeatmapInfoRequest
  ): Promise<GetBeatmapInfoResponse> {
    const rawMap = await this.beatmaps.get(
      params.appUserId,
      params.beatmapId,
      params.server
    );
    if (rawMap === undefined) {
      return {
        beatmapInfo: undefined,
      };
    }

    const hasOsuSimulationParams =
      Object.values(params.mapScoreSimulationOsu).find(x => x !== undefined) !==
      undefined;
    if (rawMap.mode === OsuRuleset.osu && hasOsuSimulationParams) {
      let mods: (Mod<ModeOsu, object> | UnremarkableMod)[] = [];
      const requestedAcronyms = params.mapScoreSimulationOsu.mods ?? [];
      for (const acronym of requestedAcronyms) {
        if (acronym.is('HT')) {
          mods.push(new HalfTime({}));
        } else if (acronym.is('DC')) {
          mods.push(new Daycore({}));
        } else if (acronym.is('DT')) {
          mods.push(new DoubleTime({}));
        } else if (acronym.is('NC')) {
          mods.push(new Nightcore({}));
        } else if (acronym.is('EZ')) {
          mods.push(new Easy({}));
        } else if (acronym.is('HR')) {
          mods.push(new HardRock({}));
        } else {
          mods.push(new UnremarkableMod(acronym));
        }
      }
      if (params.mapScoreSimulationOsu.speed !== undefined) {
        const speed = params.mapScoreSimulationOsu.speed;
        // speed parameter overrides mods that can't have that speed:
        if (speed === 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC', 'DT', 'NC'));
        } else if (speed < 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          const hasHt = mods.find(m => m.acronym.is('HT'));
          const hasDc = mods.find(m => m.acronym.is('DC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          if (!hasHt && !hasDc) {
            mods.push(new HalfTime({speedChange: speed}));
          } else if (hasHt) {
            mods.push(new HalfTime({speedChange: speed}));
          } else {
            mods.push(new Daycore({speedChange: speed}));
          }
        } else {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          const hasDt = mods.find(m => m.acronym.is('DT'));
          const hasNc = mods.find(m => m.acronym.is('NC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          if (!hasDt && !hasNc) {
            mods.push(new DoubleTime({speedChange: speed}));
          } else if (hasDt) {
            mods.push(new DoubleTime({speedChange: speed}));
          } else {
            mods.push(new Nightcore({speedChange: speed}));
          }
        }
      }
      const {ar, cs, od, hp} = params.mapScoreSimulationOsu;
      if ((ar || cs || od || hp) !== undefined) {
        mods.push(new DifficultyAdjust({ar, cs, od, hp}));
      }
      // We can calculate score pp using useAccuracyForPp with values true and false.
      // True means calculator will respect number of misses and 50s
      //   (misses and 50s impact pp directly, we can't just mix and match them
      //   to meet desired accuracy without fluctuations in end result),
      // and will try to calculate number of 300s and 100s to match provided accuracy.
      // False means number of 100s, 50s and misses is provided to pp calculator and accuracy is derived.
      // So we need to either provide [accuracy, 50s, misses] or [100s, 50s, misses];
      let finalAccuracy: number | undefined;
      let finalGoods: number | undefined;
      let finalMehs: number | undefined;
      (() => {
        const {accuracy, goods, mehs} = params.mapScoreSimulationOsu;
        // Each of the variables above can either be a number or undefined.
        // There are 8 possible combinations: 000, 001, 010, 011, 100, 101, 110, 111
        // (0 means user did not provide a value, 1 means number).
        if (
          (goods !== undefined && mehs !== undefined) ||
          accuracy === undefined
        ) {
          // If both goods and mehs were provided, they take priority over accuracy.
          // If accuracy was not provided, we can only rely on mehs and goods.
          // This covers cases 0, 1, 2, 3 and 7, leaving only 100, 101 and 110
          finalAccuracy = undefined;
          finalMehs = mehs;
          finalGoods = goods;
          return;
        } else if (goods === undefined) {
          // If goods were not provided it means calculator is free to meet
          // desired accuracy balancing 300s and 100s.
          // This covers cases 4 and 5, leaving 110.
          finalAccuracy = accuracy / 100;
          finalMehs = mehs;
          finalGoods = undefined;
          return;
        } else {
          // User provided accuracy and 100s, but calculator only respects 50s and misses
          // and changes number of 300s and 100s to match the accuracy.
          // So we derive number of 50s ourselves and use 100s, 50s and misses to calculate pp.
          const totalHits =
            rawMap.countCircles + rawMap.countSliders + rawMap.countSpinners;
          const hitsAvailable =
            totalHits - (params.mapScoreSimulationOsu.misses ?? 0) - goods;
          // accuracy = (6 * count300 + 2 * count100 + 1 * count50 + 0 * misses) / (6 * totalhits)
          // ... let count300 = x, then count50 = hitsAvailable - x:
          // accuracy = (6x + 2 * count100 + (hitsAvailable - x)) / (6 * totalHits)
          // ... multiplying both sides by right side denominator:
          // 6 * totalHits * accuracy = 6x + 2 * count100 + hitsAvailable - x
          // 5x = 6 * totalHits * accuracy - 2 * count100 - hitsAvailable
          const th = totalHits;
          const acc = accuracy / 100;
          const c100 = goods;
          const ha = hitsAvailable;
          const x = Math.round((6 * th * acc - 2 * c100 - ha) / 5);
          if (x < 0 || x > hitsAvailable) {
            throw Error('Impossible score requested');
          }
          const count300 = x;
          const count50 = hitsAvailable - count300;
          finalAccuracy = undefined;
          finalGoods = goods;
          finalMehs = count50;
          return;
        }
      })();
      const baseScore = this.beatmapInfoAdapter.createBeatmapScore({
        map: rawMap,
        ruleset: rawMap.mode,
        useAccuracyForPp: finalAccuracy !== undefined, // we won't use this though
      });
      const finalScore = baseScore.copy({
        mods: mods,
        maxCombo: params.mapScoreSimulationOsu.combo,
        accuracy: finalAccuracy,
        hitcounts: new HitcountsOsu({
          great: undefined,
          ok: finalGoods,
          meh: finalMehs,
          miss: params.mapScoreSimulationOsu.misses,
        }),
      }) as BeatmapScore<ModeOsu, HitcountsOsu>;

      // We use ScoreSimEstimationProviderOsu directly
      // because we want exact accuracy value for a given score.
      const scoreSimProvider = new ScoreSimEstimationProviderOsu({
        scoreSimulations: this.scoreSimulations,
        useAccuracy: finalAccuracy !== undefined,
      });

      await scoreSimProvider.ppEstimationProvider.getEstimation(finalScore);
      const cachedSimulationEntry = scoreSimProvider.simulationCache.find(
        x => x.score === finalScore
      );
      if (cachedSimulationEntry === undefined) {
        throw Error('Cached entry of final score was undefined');
      }
      const simulation = await cachedSimulationEntry.result;
      if (simulation === undefined) {
        throw Error('Simulation of final score was undefined');
      }
      const finalScoreStarRating = simulation.difficultyAttributes.starRating;
      const finalScorePp = simulation.performanceAttributes.pp;
      const finalScoreAccuracy = simulation.score.accuracy;
      return {
        beatmapInfo: {
          id: rawMap.id,
          mode: rawMap.mode,
          starRating: finalScoreStarRating,
          totalLength: finalScore.moddedBeatmap.song.length,
          hitLength: finalScore.moddedBeatmap.length,
          maxCombo: rawMap.maxCombo,
          version: rawMap.version,
          ar: finalScore.moddedBeatmap.stats.ar,
          cs: finalScore.moddedBeatmap.stats.cs,
          od: finalScore.moddedBeatmap.stats.od,
          hp: finalScore.moddedBeatmap.stats.hp,
          bpm: finalScore.moddedBeatmap.song.bpm,
          playcount: rawMap.playcount,
          url: rawMap.url,
          beatmapset: {
            id: rawMap.beatmapset.id,
            artist: rawMap.beatmapset.artist,
            title: rawMap.beatmapset.title,
            creator: rawMap.beatmapset.creator,
            status: rawMap.beatmapset.status,
            playcount: rawMap.beatmapset.playcount,
            favouriteCount: rawMap.beatmapset.favouriteCount,
            coverUrl: rawMap.beatmapset.coverUrl,
            previewUrl: rawMap.beatmapset.previewUrl,
          },
          ppEstimations: [
            {
              accuracy: finalScoreAccuracy,
              ppValue: finalScorePp,
            },
          ],
          simulationParams: {
            mods: finalScore.mods.map(m => m.acronym),
            combo: finalScore.maxCombo,
            accuracy: finalScoreAccuracy,
            speed: params.mapScoreSimulationOsu.speed,
            misses: finalScore.hitcounts.miss,
            mehs: finalScore.hitcounts.meh,
          },
        },
      };
    }
    const beatmapScore = this.beatmapInfoAdapter.createBeatmapScore({
      map: rawMap,
      ruleset: rawMap.mode,
      useAccuracyForPp: true,
    });
    return {
      beatmapInfo: {
        id: rawMap.id,
        mode: rawMap.mode,
        starRating: rawMap.difficultyRating,
        totalLength: rawMap.totalLength,
        hitLength: rawMap.hitLength,
        maxCombo: rawMap.maxCombo,
        version: rawMap.version,
        ar: rawMap.ar,
        cs: rawMap.cs,
        od: rawMap.od,
        hp: rawMap.hp,
        bpm: rawMap.bpm,
        playcount: rawMap.playcount,
        url: rawMap.url,
        beatmapset: {
          id: rawMap.beatmapset.id,
          artist: rawMap.beatmapset.artist,
          title: rawMap.beatmapset.title,
          creator: rawMap.beatmapset.creator,
          status: rawMap.beatmapset.status,
          playcount: rawMap.beatmapset.playcount,
          favouriteCount: rawMap.beatmapset.favouriteCount,
          coverUrl: rawMap.beatmapset.coverUrl,
          previewUrl: rawMap.beatmapset.previewUrl,
        },
        ppEstimations: [
          {
            accuracy: 100,
            ppValue: await beatmapScore.copy({accuracy: 1}).getEstimatedPp(),
          },
          {
            accuracy: 99,
            ppValue: await beatmapScore.copy({accuracy: 0.99}).getEstimatedPp(),
          },
          {
            accuracy: 98,
            ppValue: await beatmapScore.copy({accuracy: 0.98}).getEstimatedPp(),
          },
        ],
        simulationParams: undefined,
      },
    };
  }
}

import {BeatmapScore} from '../../../domain/entities/BeatmapScore';
import {HitcountsCtb} from '../../../domain/entities/hitcounts/HitcountsCtb';
import {HitcountsMania} from '../../../domain/entities/hitcounts/HitcountsMania';
import {HitcountsOsu} from '../../../domain/entities/hitcounts/HitcountsOsu';
import {HitcountsTaiko} from '../../../domain/entities/hitcounts/HitcountsTaiko';
import {ModeCtb} from '../../../domain/entities/mode/ModeCtb';
import {ModeMania} from '../../../domain/entities/mode/ModeMania';
import {ModeOsu} from '../../../domain/entities/mode/ModeOsu';
import {ModeTaiko} from '../../../domain/entities/mode/ModeTaiko';
import {Daycore as DaycoreCtb} from '../../../domain/entities/mods/ctb/Daycore';
import {DifficultyAdjust as DifficultyAdjustCtb} from '../../../domain/entities/mods/ctb/DifficultyAdjust';
import {DoubleTime as DoubleTimeCtb} from '../../../domain/entities/mods/ctb/DoubleTime';
import {Easy as EasyCtb} from '../../../domain/entities/mods/ctb/Easy';
import {HalfTime as HalfTimeCtb} from '../../../domain/entities/mods/ctb/HalfTime';
import {HardRock as HardRockCtb} from '../../../domain/entities/mods/ctb/HardRock';
import {Nightcore as NightcoreCtb} from '../../../domain/entities/mods/ctb/Nighcore';
import {Daycore as DaycoreMania} from '../../../domain/entities/mods/mania/Daycore';
import {DifficultyAdjust as DifficultyAdjustMania} from '../../../domain/entities/mods/mania/DifficultyAdjust';
import {DoubleTime as DoubleTimeMania} from '../../../domain/entities/mods/mania/DoubleTime';
import {Easy as EasyMania} from '../../../domain/entities/mods/mania/Easy';
import {HalfTime as HalfTimeMania} from '../../../domain/entities/mods/mania/HalfTime';
import {HardRock as HardRockMania} from '../../../domain/entities/mods/mania/HardRock';
import {Nightcore as NightcoreMania} from '../../../domain/entities/mods/mania/Nighcore';
import {Mod, UnremarkableMod} from '../../../domain/entities/mods/Mod';
import {Daycore as DaycoreOsu} from '../../../domain/entities/mods/osu/Daycore';
import {DifficultyAdjust as DifficultyAdjustOsu} from '../../../domain/entities/mods/osu/DifficultyAdjust';
import {DoubleTime as DoubleTimeOsu} from '../../../domain/entities/mods/osu/DoubleTime';
import {Easy as EasyOsu} from '../../../domain/entities/mods/osu/Easy';
import {HalfTime as HalfTimeOsu} from '../../../domain/entities/mods/osu/HalfTime';
import {HardRock as HardRockOsu} from '../../../domain/entities/mods/osu/HardRock';
import {Nightcore as NightcoreOsu} from '../../../domain/entities/mods/osu/Nighcore';
import {Daycore as DaycoreTaiko} from '../../../domain/entities/mods/taiko/Daycore';
import {DifficultyAdjust as DifficultyAdjustTaiko} from '../../../domain/entities/mods/taiko/DifficultyAdjust';
import {DoubleTime as DoubleTimeTaiko} from '../../../domain/entities/mods/taiko/DoubleTime';
import {Easy as EasyTaiko} from '../../../domain/entities/mods/taiko/Easy';
import {HalfTime as HalfTimeTaiko} from '../../../domain/entities/mods/taiko/HalfTime';
import {HardRock as HardRockTaiko} from '../../../domain/entities/mods/taiko/HardRock';
import {Nightcore as NightcoreTaiko} from '../../../domain/entities/mods/taiko/Nighcore';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {BeatmapInfoAdapter} from '../../adapters/beatmap_info/BeatmapInfoAdapter';
import {OsuBeatmapsDao} from '../../requirements/dao/OsuBeatmapsDao';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {ScoreSimEstimationProviderCtb} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderCtb';
import {ScoreSimEstimationProviderMania} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderMania';
import {ScoreSimEstimationProviderOsu} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderOsu';
import {ScoreSimEstimationProviderTaiko} from '../../score_sim_estimation_provider/ScoreSimEstimationProviderTaiko';
import {UseCase} from '../UseCase';
import {GetBeatmapInfoRequest} from './GetBeatmapInfoRequest';
import {GetBeatmapInfoResponse} from './GetBeatmapInfoResponse';

export class GetBeatmapInfoUseCase
  implements UseCase<GetBeatmapInfoRequest, GetBeatmapInfoResponse>
{
  beatmapInfoAdapter: BeatmapInfoAdapter;
  constructor(
    protected beatmaps: OsuBeatmapsDao,
    protected scoreSimulations: ScoreSimulationsDao
  ) {
    this.beatmapInfoAdapter = new BeatmapInfoAdapter(scoreSimulations);
  }

  async execute(
    params: GetBeatmapInfoRequest
  ): Promise<GetBeatmapInfoResponse> {
    const mapScoreSimulationOsu = params.mapScoreSimulationOsu ?? {};
    const mapScoreSimulationTaiko = params.mapScoreSimulationTaiko ?? {};
    const mapScoreSimulationCtb = params.mapScoreSimulationCtb ?? {};
    const mapScoreSimulationMania = params.mapScoreSimulationMania ?? {};

    const rawMap = await (() => {
      if (params.beatmapId !== undefined) {
        return this.beatmaps.get(
          params.initiatorAppUserId,
          params.beatmapId,
          params.server
        );
      }
      if (params.beatmapHash !== undefined) {
        return this.beatmaps.getByHash(
          params.initiatorAppUserId,
          params.beatmapHash,
          params.server
        );
      }
      throw Error(
        'Request does not have any parameters that identify a beatmap'
      );
    })();
    if (rawMap === undefined) {
      return {
        beatmapInfo: undefined,
      };
    }

    const hasOsuSimulationParams =
      Object.values(mapScoreSimulationOsu).find(x => x !== undefined) !==
      undefined;
    if (rawMap.mode === OsuRuleset.osu && hasOsuSimulationParams) {
      let mods: (Mod<ModeOsu, object> | UnremarkableMod)[] = [];
      const requestedAcronyms = mapScoreSimulationOsu.mods ?? [];
      for (const acronym of requestedAcronyms) {
        if (acronym.is('HT')) {
          mods.push(new HalfTimeOsu({}));
        } else if (acronym.is('DC')) {
          mods.push(new DaycoreOsu({}));
        } else if (acronym.is('DT')) {
          mods.push(new DoubleTimeOsu({}));
        } else if (acronym.is('NC')) {
          mods.push(new NightcoreOsu({}));
        } else if (acronym.is('EZ')) {
          mods.push(new EasyOsu({}));
        } else if (acronym.is('HR')) {
          mods.push(new HardRockOsu({}));
        } else {
          mods.push(new UnremarkableMod(acronym));
        }
      }
      if (mapScoreSimulationOsu.speed !== undefined) {
        const speed = mapScoreSimulationOsu.speed;
        // speed parameter overrides mods that can't have that speed:
        if (speed === 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC', 'DT', 'NC'));
        } else if (speed < 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          const hasHt = mods.find(m => m.acronym.is('HT'));
          const hasDc = mods.find(m => m.acronym.is('DC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          if (!hasHt && !hasDc) {
            mods.push(new HalfTimeOsu({speedChange: speed}));
          } else if (hasHt) {
            mods.push(new HalfTimeOsu({speedChange: speed}));
          } else {
            mods.push(new DaycoreOsu({speedChange: speed}));
          }
        } else {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          const hasDt = mods.find(m => m.acronym.is('DT'));
          const hasNc = mods.find(m => m.acronym.is('NC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          if (!hasDt && !hasNc) {
            mods.push(new DoubleTimeOsu({speedChange: speed}));
          } else if (hasDt) {
            mods.push(new DoubleTimeOsu({speedChange: speed}));
          } else {
            mods.push(new NightcoreOsu({speedChange: speed}));
          }
        }
      }
      const {ar, cs, od, hp} = mapScoreSimulationOsu;
      if ((ar ?? cs ?? od ?? hp) !== undefined) {
        mods.push(new DifficultyAdjustOsu({ar, cs, od, hp}));
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
        const {accuracy, goods, mehs} = mapScoreSimulationOsu;
        // Each of the variables above can either be a number or undefined.
        // There are 8 possible combinations: 000, 001, 010, 011, 100, 101, 110, 111
        // (0 means user did not provide a value, 1 means number).
        if (
          (goods !== undefined && mehs !== undefined) ||
          accuracy === undefined
        ) {
          // If both goods and mehs were provided, they take priority over accuracy.
          // If accuracy was not provided, we can only rely on mehs and goods.
          // This covers cases 0, 1, 2, 3 and 7, leaving only 100, 101 and 110.
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
            totalHits - (mapScoreSimulationOsu.misses ?? 0) - goods;
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
        useAccuracyForPp: finalAccuracy !== undefined,
      });
      const finalScore = baseScore.copy({
        mods: mods,
        maxCombo: mapScoreSimulationOsu.combo,
        accuracy: finalAccuracy,
        hitcounts: new HitcountsOsu({
          great: undefined,
          ok: finalGoods,
          meh: finalMehs,
          miss: mapScoreSimulationOsu.misses,
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
            speed: mapScoreSimulationOsu.speed,
            misses: finalScore.hitcounts.miss,
            mehs: finalScore.hitcounts.meh,
          },
        },
      };
    }
    const hasTaikoSimulationParams =
      Object.values(mapScoreSimulationTaiko).find(x => x !== undefined) !==
      undefined;
    if (rawMap.mode === OsuRuleset.taiko && hasTaikoSimulationParams) {
      let mods: (Mod<ModeTaiko, object> | UnremarkableMod)[] = [];
      const requestedAcronyms = mapScoreSimulationOsu.mods ?? [];
      for (const acronym of requestedAcronyms) {
        if (acronym.is('HT')) {
          mods.push(new HalfTimeTaiko({}));
        } else if (acronym.is('DC')) {
          mods.push(new DaycoreTaiko({}));
        } else if (acronym.is('DT')) {
          mods.push(new DoubleTimeTaiko({}));
        } else if (acronym.is('NC')) {
          mods.push(new NightcoreTaiko({}));
        } else if (acronym.is('EZ')) {
          mods.push(new EasyTaiko({}));
        } else if (acronym.is('HR')) {
          mods.push(new HardRockTaiko({}));
        } else {
          mods.push(new UnremarkableMod(acronym));
        }
      }
      if (mapScoreSimulationOsu.speed !== undefined) {
        const speed = mapScoreSimulationOsu.speed;
        // speed parameter overrides mods that can't have that speed:
        if (speed === 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC', 'DT', 'NC'));
        } else if (speed < 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          const hasHt = mods.find(m => m.acronym.is('HT'));
          const hasDc = mods.find(m => m.acronym.is('DC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          if (!hasHt && !hasDc) {
            mods.push(new HalfTimeTaiko({speedChange: speed}));
          } else if (hasHt) {
            mods.push(new HalfTimeTaiko({speedChange: speed}));
          } else {
            mods.push(new DaycoreTaiko({speedChange: speed}));
          }
        } else {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          const hasDt = mods.find(m => m.acronym.is('DT'));
          const hasNc = mods.find(m => m.acronym.is('NC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          if (!hasDt && !hasNc) {
            mods.push(new DoubleTimeTaiko({speedChange: speed}));
          } else if (hasDt) {
            mods.push(new DoubleTimeTaiko({speedChange: speed}));
          } else {
            mods.push(new NightcoreTaiko({speedChange: speed}));
          }
        }
      }
      const {od, hp} = mapScoreSimulationTaiko;
      if ((od ?? hp) !== undefined) {
        mods.push(new DifficultyAdjustTaiko({od, hp}));
      }
      // We can calculate score pp using useAccuracyForPp with values true and false.
      // True means calculator will respect number of misses
      //   (misses impact pp directly, we can't just mix and match them
      //   to meet desired accuracy without fluctuations in end result),
      // and will try to calculate number of 300s and 150s to match provided accuracy.
      // False means number of misses is provided to pp calculator and accuracy is derived.
      // So we need to either provide [accuracy, misses] or [150s, misses];
      let finalAccuracy: number | undefined;
      let finalGoods: number | undefined;
      (() => {
        const {accuracy, goods} = mapScoreSimulationTaiko;
        // Each of the variables above can either be a number or undefined.
        // There are 4 possible combinations: 00, 01, 10, 11
        // (0 means user did not provide a value, 1 means number).
        if (goods !== undefined || accuracy === undefined) {
          // If goods were provided, they take priority over accuracy.
          // If accuracy was not provided, we can only rely on goods.
          // This covers cases 0, 1, and 3 leaving only 10.
          finalAccuracy = undefined;
          finalGoods = goods;
          return;
        } else {
          // User provided only accuracy
          finalAccuracy = accuracy / 100;
          finalGoods = goods;
          return;
        }
      })();
      const baseScore = this.beatmapInfoAdapter.createBeatmapScore({
        map: rawMap,
        ruleset: rawMap.mode,
        useAccuracyForPp: finalAccuracy !== undefined,
      });
      const finalScore = baseScore.copy({
        mods: mods,
        maxCombo: mapScoreSimulationOsu.combo,
        accuracy: finalAccuracy,
        hitcounts: new HitcountsTaiko({
          great: undefined,
          ok: finalGoods,
          miss: mapScoreSimulationOsu.misses,
        }),
      }) as BeatmapScore<ModeTaiko, HitcountsTaiko>;

      // We use ScoreSimEstimationProviderTaiko directly
      // because we want exact accuracy value for a given score.
      const scoreSimProvider = new ScoreSimEstimationProviderTaiko({
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
            speed: mapScoreSimulationOsu.speed,
            misses: finalScore.hitcounts.miss,
            mehs: 0,
          },
        },
      };
    }
    const hasCtbSimulationParams =
      Object.values(mapScoreSimulationCtb).find(x => x !== undefined) !==
      undefined;
    if (rawMap.mode === OsuRuleset.ctb && hasCtbSimulationParams) {
      let mods: (Mod<ModeCtb, object> | UnremarkableMod)[] = [];
      const requestedAcronyms = mapScoreSimulationOsu.mods ?? [];
      for (const acronym of requestedAcronyms) {
        if (acronym.is('HT')) {
          mods.push(new HalfTimeCtb({}));
        } else if (acronym.is('DC')) {
          mods.push(new DaycoreCtb({}));
        } else if (acronym.is('DT')) {
          mods.push(new DoubleTimeCtb({}));
        } else if (acronym.is('NC')) {
          mods.push(new NightcoreCtb({}));
        } else if (acronym.is('EZ')) {
          mods.push(new EasyCtb({}));
        } else if (acronym.is('HR')) {
          mods.push(new HardRockCtb({}));
        } else {
          mods.push(new UnremarkableMod(acronym));
        }
      }
      if (mapScoreSimulationOsu.speed !== undefined) {
        const speed = mapScoreSimulationOsu.speed;
        // speed parameter overrides mods that can't have that speed:
        if (speed === 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC', 'DT', 'NC'));
        } else if (speed < 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          const hasHt = mods.find(m => m.acronym.is('HT'));
          const hasDc = mods.find(m => m.acronym.is('DC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          if (!hasHt && !hasDc) {
            mods.push(new HalfTimeCtb({speedChange: speed}));
          } else if (hasHt) {
            mods.push(new HalfTimeCtb({speedChange: speed}));
          } else {
            mods.push(new DaycoreCtb({speedChange: speed}));
          }
        } else {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          const hasDt = mods.find(m => m.acronym.is('DT'));
          const hasNc = mods.find(m => m.acronym.is('NC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          if (!hasDt && !hasNc) {
            mods.push(new DoubleTimeCtb({speedChange: speed}));
          } else if (hasDt) {
            mods.push(new DoubleTimeCtb({speedChange: speed}));
          } else {
            mods.push(new NightcoreCtb({speedChange: speed}));
          }
        }
      }
      const {ar, cs, hp} = mapScoreSimulationCtb;
      if ((ar ?? cs ?? hp) !== undefined) {
        mods.push(new DifficultyAdjustCtb({ar, cs, hp}));
      }
      const baseScore = this.beatmapInfoAdapter.createBeatmapScore({
        map: rawMap,
        ruleset: rawMap.mode,
        useAccuracyForPp: false,
      });
      // We can calculate score pp using useAccuracyForPp with values true and false.
      // True means calculator will respect number of misses
      // and will try to calculate number of small misses to match provided accuracy.
      // False means number of misses and small misses is provided to pp calculator and accuracy is derived.
      // So we need to either provide [accuracy, misses] or [misses, smallMisses];
      let finalAccuracy: number | undefined;
      let finalSmallMisses: number | undefined;
      let finalMisses: number | undefined;
      await (async () => {
        const {accuracy, smallMisses, misses} = mapScoreSimulationCtb;
        // Each of the variables above can either be a number or undefined.
        // There are 8 possible combinations: 000, 001, 010, 011, 100, 101, 110, 111
        // (0 means user did not provide a value, 1 means number).
        if (
          (misses !== undefined && smallMisses !== undefined) ||
          (accuracy === undefined && smallMisses === undefined)
        ) {
          // If both misses and small misses were provided, they take priority over accuracy.
          // If we don't have both accuracy and small misses, we can only rely on misses.
          // This covers cases 0, 1, 3 and 7, leaving only 010, 100, 101 and 110.
          finalAccuracy = undefined;
          finalSmallMisses = smallMisses;
          finalMisses = misses;
          return;
        } else if (smallMisses === undefined) {
          // If small misses were not provided it means calculator is free to meet
          // desired accuracy balancing small tick hits and small tick misses.
          // This covers cases 4 and 5, leaving 010 and 110.
          finalAccuracy = accuracy !== undefined ? accuracy / 100 : undefined;
          finalSmallMisses = undefined;
          finalMisses = misses;
          return;
        } else {
          // User provided small misses and maybe accuracy, but calculator only respects misses
          // and changes number of small misses match the accuracy.
          // So we derive number of small misses ourselves and use misses + small misses to calculate pp.

          let largeTotal: number;
          let smallTotal: number;
          const acc = await (async () => {
            // We use ScoreSimEstimationProviderCtb directly
            // because we can't get small tick hit total directly from the API.
            const scoreSimProvider = new ScoreSimEstimationProviderCtb({
              scoreSimulations: this.scoreSimulations,
              useAccuracy: true,
            });

            await scoreSimProvider.ppEstimationProvider.getEstimation(
              baseScore as BeatmapScore<ModeCtb, HitcountsCtb>
            );
            const cachedSimulationEntry = scoreSimProvider.simulationCache.find(
              x => x.score === baseScore
            );
            if (cachedSimulationEntry === undefined) {
              throw Error(
                'Could not calculate accuracy based on small misses (cache entry of simulation was undefined)'
              );
            }
            const simulation = await cachedSimulationEntry.result;
            if (simulation === undefined) {
              throw Error(
                'Could not calculate accuracy based on small misses (simulation was undefined)'
              );
            }
            const stats = simulation.score.statistics;
            largeTotal = stats.great + stats.largeTickHit + stats.miss;
            smallTotal = stats.smallTickHit + stats.smallTickMiss;
            if (accuracy !== undefined) {
              return accuracy / 100;
            }
            // Derive accuracy from small misses
            return (
              (largeTotal + smallTotal - smallMisses) /
              (largeTotal + smallTotal)
            );
          })();

          // accuracy = (largeHits + smallHits) / (largeTotal + smallTotal)
          // let (largeTotal + smallTotal) be allTotal to make it shorter:
          // accuracy = (largeHits + smallHits) / allTotal
          // let largeHits be (largeTotal - largeMisses):
          // accuracy = (largeTotal - largeMisses + smallHits) / allTotal
          // let largeMisses = x
          // accuracy = (largeTotal - x + smallHits) / allTotal
          // accuracy * allTotal = largeTotal - x + smallHits
          // x = largeTotal + smallHits - accuracy * allTotal
          const lt = largeTotal!; // idk why linter trips here (TS2454)
          const sh = smallTotal! - smallMisses;
          const at = largeTotal! + smallTotal!;
          const x = Math.round(lt + sh - acc * at);
          if (x < 0 || x > largeTotal!) {
            throw Error('Impossible score requested');
          }
          const largeMisses = x;
          finalAccuracy = undefined;
          finalSmallMisses = smallMisses;
          finalMisses = largeMisses;
          return;
        }
      })();
      const finalScore = baseScore.copy({
        mods: mods,
        maxCombo: mapScoreSimulationOsu.combo,
        accuracy: finalAccuracy,
        hitcounts: new HitcountsCtb({
          miss: finalMisses,
          smallTickMiss: finalSmallMisses,
        }),
      }) as BeatmapScore<ModeCtb, HitcountsCtb>;

      // We use ScoreSimEstimationProviderCtb directly
      // because we want exact accuracy value for a given score.
      const scoreSimProvider = new ScoreSimEstimationProviderCtb({
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
            speed: mapScoreSimulationOsu.speed,
            misses: finalScore.hitcounts.miss,
            mehs: 0,
            smallTickHit: simulation.score.statistics.smallTickHit,
            smallTickMiss: simulation.score.statistics.smallTickMiss,
          },
        },
      };
    }
    const hasManiaSimulationParams =
      Object.values(mapScoreSimulationMania).find(x => x !== undefined) !==
      undefined;
    if (rawMap.mode === OsuRuleset.mania && hasManiaSimulationParams) {
      let mods: (Mod<ModeMania, object> | UnremarkableMod)[] = [];
      const requestedAcronyms = mapScoreSimulationOsu.mods ?? [];
      for (const acronym of requestedAcronyms) {
        if (acronym.is('HT')) {
          mods.push(new HalfTimeMania({}));
        } else if (acronym.is('DC')) {
          mods.push(new DaycoreMania({}));
        } else if (acronym.is('DT')) {
          mods.push(new DoubleTimeMania({}));
        } else if (acronym.is('NC')) {
          mods.push(new NightcoreMania({}));
        } else if (acronym.is('EZ')) {
          mods.push(new EasyMania({}));
        } else if (acronym.is('HR')) {
          mods.push(new HardRockMania({}));
        } else {
          mods.push(new UnremarkableMod(acronym));
        }
      }
      if (mapScoreSimulationOsu.speed !== undefined) {
        const speed = mapScoreSimulationOsu.speed;
        // speed parameter overrides mods that can't have that speed:
        if (speed === 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC', 'DT', 'NC'));
        } else if (speed < 1) {
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          const hasHt = mods.find(m => m.acronym.is('HT'));
          const hasDc = mods.find(m => m.acronym.is('DC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          if (!hasHt && !hasDc) {
            mods.push(new HalfTimeMania({speedChange: speed}));
          } else if (hasHt) {
            mods.push(new HalfTimeMania({speedChange: speed}));
          } else {
            mods.push(new DaycoreMania({speedChange: speed}));
          }
        } else {
          mods = mods.filter(m => !m.acronym.isAnyOf('HT', 'DC'));
          const hasDt = mods.find(m => m.acronym.is('DT'));
          const hasNc = mods.find(m => m.acronym.is('NC'));
          mods = mods.filter(m => !m.acronym.isAnyOf('DT', 'NC'));
          if (!hasDt && !hasNc) {
            mods.push(new DoubleTimeMania({speedChange: speed}));
          } else if (hasDt) {
            mods.push(new DoubleTimeMania({speedChange: speed}));
          } else {
            mods.push(new NightcoreMania({speedChange: speed}));
          }
        }
      }
      const {od, hp} = mapScoreSimulationMania;
      if ((od ?? hp) !== undefined) {
        mods.push(new DifficultyAdjustMania({od, hp}));
      }
      const finalAccuracy = mapScoreSimulationMania.accuracy;
      const baseScore = this.beatmapInfoAdapter.createBeatmapScore({
        map: rawMap,
        ruleset: rawMap.mode,
        useAccuracyForPp: finalAccuracy !== undefined,
      });
      const finalScore = baseScore.copy({
        mods: mods,
        maxCombo: mapScoreSimulationMania.combo,
        accuracy: finalAccuracy !== undefined ? finalAccuracy / 100 : undefined,
        hitcounts: new HitcountsMania({
          miss: mapScoreSimulationMania.misses,
        }),
      }) as BeatmapScore<ModeMania, HitcountsMania>;

      // We use ScoreSimEstimationProviderTaiko directly
      // because we want exact accuracy value for a given score.
      const scoreSimProvider = new ScoreSimEstimationProviderMania({
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
            speed: mapScoreSimulationOsu.speed,
            misses: finalScore.hitcounts.miss,
            mehs: 0,
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

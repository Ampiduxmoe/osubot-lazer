import {UseCase} from '../UseCase';
import {GetRecentPlaysRequest} from './GetRecentPlaysRequest';
import {
  GetRecentPlaysResponse,
  RecentPlay,
  BeatmapsetRankStatus,
  SettingsDT,
  SettingsHT,
  SettingsDA,
} from './GetRecentPlaysResponse';
import {
  OsuRecentScoresDao,
  RecentScore,
} from '../../../data/dao/OsuRecentScoresDao';
import {CachedOsuIdsDao} from '../../../data/dao/CachedOsuIdsDao';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {ScoreSimulationsDao} from '../../../data/dao/ScoreSimulationsDao';
import {BeatmapStats} from '../../entities/BeatmapStats';

export class GetRecentPlaysUseCase
  implements UseCase<GetRecentPlaysRequest, GetRecentPlaysResponse>
{
  recentScores: OsuRecentScoresDao;
  scoreSimulations: ScoreSimulationsDao;
  cachedOsuIds: CachedOsuIdsDao;
  osuUsers: OsuUsersDao;
  constructor(
    recentScores: OsuRecentScoresDao,
    scoreSimulations: ScoreSimulationsDao,
    cachedOsuIds: CachedOsuIdsDao,
    osuUsers: OsuUsersDao
  ) {
    this.recentScores = recentScores;
    this.scoreSimulations = scoreSimulations;
    this.cachedOsuIds = cachedOsuIds;
    this.osuUsers = osuUsers;
  }
  async execute(
    params: GetRecentPlaysRequest
  ): Promise<GetRecentPlaysResponse> {
    const username = params.username;
    const server = params.server;
    const osuIdAndUsername = await this.cachedOsuIds.get(username, server);
    let osuId = osuIdAndUsername?.id;
    let caseCorrectUsername = osuIdAndUsername?.username;
    if (osuId === undefined || caseCorrectUsername === undefined) {
      const osuUser = await this.osuUsers.getByUsername(
        username,
        server,
        OsuRuleset.osu
      );
      if (osuUser === undefined) {
        return {
          isFailure: true,
          failureReason: 'user not found',
        };
      }
      osuId = osuUser.id;
      caseCorrectUsername = osuUser.username;
    }
    osuId = osuId!;
    caseCorrectUsername = caseCorrectUsername!;
    const rawRecentScores = await this.recentScores.get(
      osuId,
      server,
      params.includeFails,
      params.mods,
      params.quantity,
      params.startPosition,
      OsuRuleset.osu
    );
    const recentPlayPromises = rawRecentScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const map = s.beatmap;
      const counts = s.statistics;
      const hitcountsTotal =
        counts.great + counts.ok + counts.meh + counts.miss;
      const objectsTotal =
        map.countCircles + map.countSliders + map.countSpinners;
      const totalToHitRatio = objectsTotal / hitcountsTotal;
      const fullPlayMisses = Math.floor(totalToHitRatio * counts.miss);
      const fullPlayMehs = Math.floor(totalToHitRatio * counts.meh);
      const fullPlayGoods = Math.floor(totalToHitRatio * counts.ok);
      const simulationParams = getSimulationParams(s);
      const scoreSimulation = await this.scoreSimulations.get(
        s.beatmap.id,
        mods,
        s.maxCombo,
        fullPlayMisses,
        fullPlayMehs,
        fullPlayGoods,
        simulationParams
      );
      const moddedBeatmapStats = new BeatmapStats(
        s.beatmap.ar,
        s.beatmap.cs,
        s.beatmap.od,
        s.beatmap.hp
      );
      if (mods.find(m => m.toLowerCase() === 'da')) {
        if (simulationParams?.difficultyAdjust !== undefined) {
          moddedBeatmapStats.applyDaMod(simulationParams.difficultyAdjust);
        }
      } else if (mods.find(m => m.toLowerCase() === 'hr')) {
        moddedBeatmapStats.applyHrMod();
      } else if (mods.find(m => m.toLowerCase() === 'ez')) {
        moddedBeatmapStats.applyEzMod();
      }
      const osuUserRecentScore: RecentPlay = {
        absolutePosition: s.absolutePosision,
        beatmapset: {
          status: extractBeatmapsetRankStatus(s),
          artist: s.beatmapset.artist,
          title: s.beatmapset.title,
          creator: s.beatmapset.creator,
        },
        beatmap: {
          difficultyName: s.beatmap.version,
          totalLength: s.beatmap.totalLength,
          drainLength: s.beatmap.hitLength,
          bpm: s.beatmap.bpm,
          stars: s.beatmap.difficultyRating,
          ar: s.beatmap.ar,
          cs: s.beatmap.cs,
          od: s.beatmap.od,
          hp: s.beatmap.hp,
          maxCombo: scoreSimulation.difficultyAttributes.maxCombo,
          url: s.beatmap.url,
          countCircles: s.beatmap.countCircles,
          countSliders: s.beatmap.countSliders,
          countSpinners: s.beatmap.countSpinners,
        },
        mods: s.mods,
        stars: scoreSimulation.difficultyAttributes.starRating,
        ar: scoreSimulation.difficultyAttributes.approachRate,
        cs: moddedBeatmapStats.cs,
        od: scoreSimulation.difficultyAttributes.overallDifficulty,
        hp: moddedBeatmapStats.hp,
        passed: s.passed,
        totalScore: s.totalScore,
        combo: s.maxCombo,
        accuracy: s.accuracy,
        pp: {
          value:
            s.pp === null ? scoreSimulation.performanceAttributes.pp : s.pp,
          ifFc: NaN,
          ifSs: NaN,
        },
        countGreat: s.statistics.great,
        countOk: s.statistics.ok,
        countMeh: s.statistics.meh,
        countMiss: s.statistics.miss,
        grade: s.rank,
      };
      return osuUserRecentScore;
    });
    const recentPlays = await Promise.all(recentPlayPromises);
    if (recentPlays.length === 1) {
      const simulatedPpValues = await getFcAndSsValues(
        rawRecentScores[0],
        this.scoreSimulations
      );
      recentPlays[0].pp = {
        value: recentPlays[0].pp.value,
        ifFc: simulatedPpValues.fc,
        ifSs: simulatedPpValues.ss,
      };
    }
    return {
      isFailure: false,
      recentPlays: {
        username: caseCorrectUsername,
        plays: recentPlays,
      },
    };
  }
}

async function getFcAndSsValues(
  score: RecentScore,
  dao: ScoreSimulationsDao
): Promise<{
  fc: number;
  ss: number;
}> {
  const mods = score.mods.map(s => s.acronym);
  const map = score.beatmap;
  const counts = score.statistics;
  const hitcountsTotal = counts.great + counts.ok + counts.meh + counts.miss;
  const objectsTotal = map.countCircles + map.countSliders + map.countSpinners;
  const totalToHitRatio = objectsTotal / hitcountsTotal;
  const fullPlayMehs = Math.floor(totalToHitRatio * counts.meh);
  const fullPlayGoods = Math.floor(totalToHitRatio * counts.ok);
  const simulationParams = getSimulationParams(score);

  // eslint-disable-next-line prettier/prettier
  const fcPromise = dao.get(map.id, mods, null, 0, fullPlayMehs, fullPlayGoods, simulationParams);
  const ssPromise = dao.get(map.id, mods, null, 0, 0, 0, simulationParams);
  return {
    fc: (await fcPromise).performanceAttributes.pp,
    ss: (await ssPromise).performanceAttributes.pp,
  };
}

interface SimulationParams {
  dtRate?: number;
  htRate?: number;
  difficultyAdjust?: {
    ar?: number;
    cs?: number;
    od?: number;
    hp?: number;
  };
}
function getSimulationParams(score: RecentScore): SimulationParams | undefined {
  let simulationParams: SimulationParams | undefined = undefined;
  const dt = score.mods.find(m => m.acronym.toLowerCase() === 'dt');
  if (dt !== undefined && dt.settings !== undefined) {
    const dtRate = (dt.settings as SettingsDT).speed_change;
    if (dtRate !== undefined) {
      simulationParams = {dtRate};
    }
  }
  const ht = score.mods.find(m => m.acronym.toLowerCase() === 'ht');
  if (ht !== undefined && ht.settings !== undefined) {
    const htRate = (ht.settings as SettingsHT).speed_change;
    if (htRate !== undefined) {
      simulationParams = {htRate};
    }
  }
  const da = score.mods.find(m => m.acronym.toLowerCase() === 'da');
  if (da !== undefined && da.settings !== undefined) {
    const settingsDa = da.settings as SettingsDA;
    const ar = settingsDa.approach_rate;
    const cs = settingsDa.circle_size;
    const od = settingsDa.overall_difficulty;
    const hp = settingsDa.drain_rate;
    simulationParams ??= {};
    simulationParams.difficultyAdjust = {ar, cs, od, hp};
  }
  return simulationParams;
}

function extractBeatmapsetRankStatus(score: RecentScore): BeatmapsetRankStatus {
  switch (score.beatmapset.status) {
    case 'graveyard':
      return 'Graveyard';
    case 'wip':
      return 'Wip';
    case 'pending':
      return 'Pending';
    case 'ranked':
      return 'Ranked';
    case 'approved':
      return 'Approved';
    case 'qualified':
      return 'Qualified';
    case 'loved':
      return 'Loved';
    default:
      throw Error('Unkown beatmapset status');
  }
}

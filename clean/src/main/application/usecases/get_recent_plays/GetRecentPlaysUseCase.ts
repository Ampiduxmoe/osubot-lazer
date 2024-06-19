import {UseCase} from '../UseCase';
import {GetRecentPlaysRequest} from './GetRecentPlaysRequest';
import {
  GetRecentPlaysResponse,
  RecentPlay,
  BeatmapsetRankStatus,
  SettingsDT,
  SettingsHT,
  SettingsDA,
  RecentPlayStatisticsTaiko,
  RecentPlayStatisticsMania,
  RecentPlayStatisticsCtb,
} from './GetRecentPlaysResponse';
import {
  OsuRecentScoresDao,
  RecentScore,
} from '../../requirements/dao/OsuRecentScoresDao';
import {CachedOsuUsersDao} from '../../requirements/dao/CachedOsuUsersDao';
import {OsuUsersDao} from '../../requirements/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {ScoreSimulationsDao} from '../../requirements/dao/ScoreSimulationsDao';
import {OsuServer} from '../../../../primitives/OsuServer';
import {BeatmapStats} from '../../../domain/entities/BeatmapStats';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export class GetRecentPlaysUseCase
  implements UseCase<GetRecentPlaysRequest, GetRecentPlaysResponse>
{
  recentScores: OsuRecentScoresDao;
  scoreSimulations: ScoreSimulationsDao;
  cachedOsuUsers: CachedOsuUsersDao;
  osuUsers: OsuUsersDao;
  constructor(
    recentScores: OsuRecentScoresDao,
    scoreSimulations: ScoreSimulationsDao,
    cachedOsuUsers: CachedOsuUsersDao,
    osuUsers: OsuUsersDao
  ) {
    this.recentScores = recentScores;
    this.scoreSimulations = scoreSimulations;
    this.cachedOsuUsers = cachedOsuUsers;
    this.osuUsers = osuUsers;
  }
  async execute(
    params: GetRecentPlaysRequest
  ): Promise<GetRecentPlaysResponse> {
    const {appUserId, username, server, ruleset} = params;
    const userSnapshot = await this.cachedOsuUsers.get(username, server);
    let osuId = userSnapshot?.id;
    let caseCorrectUsername = userSnapshot?.username;
    let mode = ruleset ?? userSnapshot?.preferredMode;
    if (
      osuId === undefined ||
      caseCorrectUsername === undefined ||
      mode === undefined
    ) {
      const osuUser = await this.osuUsers.getByUsername(
        appUserId,
        username,
        server,
        undefined
      );
      if (osuUser === undefined) {
        return {
          isFailure: true,
          failureReason: 'user not found',
        };
      }
      osuId = osuUser.id;
      caseCorrectUsername = osuUser.username;
      mode ??= osuUser.preferredMode;
    }
    switch (mode) {
      case OsuRuleset.osu:
        return await this.executeForOsu(
          appUserId,
          server,
          caseCorrectUsername,
          osuId,
          params.includeFails,
          params.startPosition,
          params.quantity,
          params.mods
        );
      case OsuRuleset.taiko:
        return await this.executeForTaiko(
          appUserId,
          server,
          caseCorrectUsername,
          osuId,
          params.includeFails,
          params.startPosition,
          params.quantity,
          params.mods
        );
      case OsuRuleset.ctb:
        return await this.executeForCtb(
          appUserId,
          server,
          caseCorrectUsername,
          osuId,
          params.includeFails,
          params.startPosition,
          params.quantity,
          params.mods
        );
      case OsuRuleset.mania:
        return await this.executeForMania(
          appUserId,
          server,
          caseCorrectUsername,
          osuId,
          params.includeFails,
          params.startPosition,
          params.quantity,
          params.mods
        );
      default:
        throw Error('Switch case is not exhaustive!');
    }
  }

  async executeForOsu(
    appUserId: string,
    server: OsuServer,
    username: string,
    osuId: number,
    includeFails: boolean,
    startPosition: number,
    quantity: number,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[]
  ): Promise<GetRecentPlaysResponse> {
    const ruleset = OsuRuleset.osu;
    const rawRecentScores = await this.recentScores.get(
      appUserId,
      osuId,
      server,
      includeFails,
      mods,
      quantity,
      startPosition,
      ruleset
    );
    const starsChangingMods = [
      'ez', // Easy
      'ht', // Half Time
      'dc', // Daycore
      'hr', // Hard Rock
      'dt', // Double Time
      'nc', // Nightcore
      'fl', // Flashlight
      'rx', // Relax
      'tp', // Target Practice
      'da', // Difficulty Adjust
      'rd', // Random
      'wu', // Wind Up
      'wd', // Wind Down
    ];
    const recentPlayPromises = rawRecentScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const map = s.beatmap;
      const counts = {
        great: s.statistics.great ?? 0,
        ok: s.statistics.ok ?? 0,
        meh: s.statistics.meh ?? 0,
        miss: s.statistics.miss ?? 0,
      };
      const hitcountsTotal =
        counts.great + counts.ok + counts.meh + counts.miss;
      const objectsTotal =
        map.countCircles + map.countSliders + map.countSpinners;
      const totalToHitRatio = objectsTotal / hitcountsTotal;
      const fullPlayMisses = Math.floor(totalToHitRatio * counts.miss);
      const fullPlayMehs = Math.floor(totalToHitRatio * counts.meh);
      const fullPlayGoods = Math.floor(totalToHitRatio * counts.ok);
      const simulationParams = getSimulationParamsOsu(s);
      const scoreSimulation = await this.scoreSimulations.getForOsu(
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
      if (mods.find(m => m.is('da'))) {
        if (simulationParams?.difficultyAdjust !== undefined) {
          moddedBeatmapStats.applyDaMod(simulationParams.difficultyAdjust);
        }
      } else if (mods.find(m => m.is('hr'))) {
        moddedBeatmapStats.applyHrMod();
      } else if (mods.find(m => m.is('ez'))) {
        moddedBeatmapStats.applyEzMod();
      }

      if (mods.find(m => m.is('tp'))) {
        moddedBeatmapStats.applyTpMod();
      }

      if (mods.find(m => m.isAnyOf('ht', 'dc'))) {
        moddedBeatmapStats.applyHtMod(simulationParams?.htRate);
      } else if (mods.find(m => m.isAnyOf('dt', 'nc'))) {
        moddedBeatmapStats.applyDtMod(simulationParams?.dtRate);
      }

      const hasStarsChangingMods =
        mods.find(m => m.isAnyOf(...starsChangingMods)) !== undefined;

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
          maxCombo: scoreSimulation?.difficultyAttributes.maxCombo,
          url: s.beatmap.url,
          countCircles: s.beatmap.countCircles,
          countSliders: s.beatmap.countSliders,
          countSpinners: s.beatmap.countSpinners,
        },
        mods: s.mods,
        stars: hasStarsChangingMods
          ? scoreSimulation?.difficultyAttributes.starRating
          : s.beatmap.difficultyRating,
        ar: moddedBeatmapStats.ar,
        cs: moddedBeatmapStats.cs,
        od: moddedBeatmapStats.od,
        hp: moddedBeatmapStats.hp,
        passed: s.passed,
        totalScore: s.totalScore,
        combo: s.maxCombo,
        accuracy: s.accuracy,
        pp: {
          value: s.pp ?? scoreSimulation?.performanceAttributes.pp,
          ifFc: undefined,
          ifSs: undefined,
        },
        statistics: {
          countGreat: counts.great,
          countOk: counts.ok,
          countMeh: counts.meh,
          countMiss: counts.miss,
        },
        grade: s.rank,
      };
      return osuUserRecentScore;
    });
    const recentPlays = await Promise.all(recentPlayPromises);
    if (recentPlays.length === 1) {
      const simulatedPpValues = await getOsuFcAndSsValues(
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
      ruleset: ruleset,
      recentPlays: {
        username: username,
        plays: recentPlays,
      },
    };
  }

  async executeForTaiko(
    appUserId: string,
    server: OsuServer,
    username: string,
    osuId: number,
    includeFails: boolean,
    startPosition: number,
    quantity: number,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[]
  ): Promise<GetRecentPlaysResponse> {
    const ruleset = OsuRuleset.taiko;
    const rawRecentScores = await this.recentScores.get(
      appUserId,
      osuId,
      server,
      includeFails,
      mods,
      quantity,
      startPosition,
      ruleset
    );
    const recentPlayPromises = rawRecentScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const scoreSimulation = await this.scoreSimulations.getForTaiko(
        s.beatmap.id,
        mods
      );
      const maxCombo = scoreSimulation?.difficultyAttributes.maxCombo;
      const stars = scoreSimulation?.difficultyAttributes.starRating;
      return recentScoreToRecentPlay(s, ruleset, maxCombo, stars);
    });
    const recentPlays = await Promise.all(recentPlayPromises);
    return {
      isFailure: false,
      ruleset: ruleset,
      recentPlays: {
        username: username,
        plays: recentPlays,
      },
    };
  }

  async executeForCtb(
    appUserId: string,
    server: OsuServer,
    username: string,
    osuId: number,
    includeFails: boolean,
    startPosition: number,
    quantity: number,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[]
  ): Promise<GetRecentPlaysResponse> {
    const ruleset = OsuRuleset.ctb;
    const rawRecentScores = await this.recentScores.get(
      appUserId,
      osuId,
      server,
      includeFails,
      mods,
      quantity,
      startPosition,
      ruleset
    );
    const recentPlayPromises = rawRecentScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const scoreSimulation = await this.scoreSimulations.getForCtb(
        s.beatmap.id,
        mods
      );
      const maxCombo = scoreSimulation?.difficultyAttributes.maxCombo;
      const stars = scoreSimulation?.difficultyAttributes.starRating;
      return recentScoreToRecentPlay(s, ruleset, maxCombo, stars);
    });
    const recentPlays = await Promise.all(recentPlayPromises);
    return {
      isFailure: false,
      ruleset: ruleset,
      recentPlays: {
        username: username,
        plays: recentPlays,
      },
    };
  }

  async executeForMania(
    appUserId: string,
    server: OsuServer,
    username: string,
    osuId: number,
    includeFails: boolean,
    startPosition: number,
    quantity: number,
    mods: {
      acronym: ModAcronym;
      isOptional: boolean;
    }[]
  ): Promise<GetRecentPlaysResponse> {
    const ruleset = OsuRuleset.mania;
    const rawRecentScores = await this.recentScores.get(
      appUserId,
      osuId,
      server,
      includeFails,
      mods,
      quantity,
      startPosition,
      ruleset
    );
    const recentPlayPromises = rawRecentScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const scoreSimulation = await this.scoreSimulations.getForMania(
        s.beatmap.id,
        mods
      );
      const maxCombo = scoreSimulation?.difficultyAttributes.maxCombo;
      const stars = scoreSimulation?.difficultyAttributes.starRating;
      return recentScoreToRecentPlay(s, ruleset, maxCombo, stars);
    });
    const recentPlays = await Promise.all(recentPlayPromises);
    return {
      isFailure: false,
      ruleset: ruleset,
      recentPlays: {
        username: username,
        plays: recentPlays,
      },
    };
  }
}

async function getOsuFcAndSsValues(
  score: RecentScore,
  dao: ScoreSimulationsDao
): Promise<{
  fc: number | undefined;
  ss: number | undefined;
}> {
  const mods = score.mods.map(s => s.acronym);
  const map = score.beatmap;
  const counts = {
    great: score.statistics.great ?? 0,
    ok: score.statistics.ok ?? 0,
    meh: score.statistics.meh ?? 0,
    miss: score.statistics.miss ?? 0,
  };
  const hitcountsTotal = counts.great + counts.ok + counts.meh + counts.miss;
  const objectsTotal = map.countCircles + map.countSliders + map.countSpinners;
  const totalToHitRatio = objectsTotal / hitcountsTotal;
  const fullPlayMehs = Math.floor(totalToHitRatio * counts.meh);
  const fullPlayGoods = Math.floor(totalToHitRatio * counts.ok);
  const simulationParams = getSimulationParamsOsu(score);

  const fcPromise = dao.getForOsu(
    map.id,
    mods,
    null,
    0,
    fullPlayMehs,
    fullPlayGoods,
    simulationParams
  );
  const ssPromise = dao.getForOsu(
    map.id,
    mods,
    null,
    0,
    0,
    0,
    simulationParams
  );
  return {
    fc: (await fcPromise)?.performanceAttributes.pp,
    ss: (await ssPromise)?.performanceAttributes.pp,
  };
}

interface SimulationParamsOsu {
  dtRate?: number;
  htRate?: number;
  difficultyAdjust?: {
    ar?: number;
    cs?: number;
    od?: number;
    hp?: number;
  };
}
function getSimulationParamsOsu(
  score: RecentScore
): SimulationParamsOsu | undefined {
  let simulationParams: SimulationParamsOsu | undefined = undefined;
  const dt = score.mods.find(m => m.acronym.is('dt'));
  if (dt !== undefined && dt.settings !== undefined) {
    const dtRate = (dt.settings as SettingsDT).speed_change;
    if (dtRate !== undefined) {
      simulationParams = {dtRate};
    }
  }
  const ht = score.mods.find(m => m.acronym.is('ht'));
  if (ht !== undefined && ht.settings !== undefined) {
    const htRate = (ht.settings as SettingsHT).speed_change;
    if (htRate !== undefined) {
      simulationParams = {htRate};
    }
  }
  const da = score.mods.find(m => m.acronym.is('da'));
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

// general function for taiko, ctb and mania modes
function recentScoreToRecentPlay(
  s: RecentScore,
  ruleset: OsuRuleset,
  maxCombo: number | undefined,
  stars: number | undefined
): RecentPlay {
  let statistics:
    | RecentPlayStatisticsTaiko
    | RecentPlayStatisticsCtb
    | RecentPlayStatisticsMania;
  if (ruleset === OsuRuleset.taiko) {
    const taikoStatistics: RecentPlayStatisticsTaiko = {
      countGreat: s.statistics.great ?? 0,
      countOk: s.statistics.ok ?? 0,
      countMiss: s.statistics.miss ?? 0,
    };
    statistics = taikoStatistics;
  } else if (ruleset === OsuRuleset.ctb) {
    const ctbStatistics: RecentPlayStatisticsCtb = {
      countGreat: s.statistics.great ?? 0,
      countLargeTickHit: s.statistics.largeTickHit ?? 0,
      countSmallTickHit: s.statistics.smallTickHit ?? 0,
      countSmallTickMiss: s.statistics.smallTickMiss ?? 0,
      countMiss: s.statistics.miss ?? 0,
    };
    statistics = ctbStatistics;
  } else if (ruleset === OsuRuleset.mania) {
    const maniaStatistics: RecentPlayStatisticsMania = {
      countPerfect: s.statistics.perfect ?? 0,
      countGreat: s.statistics.great ?? 0,
      countGood: s.statistics.good ?? 0,
      countOk: s.statistics.ok ?? 0,
      countMeh: s.statistics.meh ?? 0,
      countMiss: s.statistics.miss ?? 0,
    };
    statistics = maniaStatistics;
  } else {
    throw Error('This method should not be used for other modes');
  }
  return {
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
      maxCombo: maxCombo,
      url: s.beatmap.url,
      countCircles: s.beatmap.countCircles,
      countSliders: s.beatmap.countSliders,
      countSpinners: s.beatmap.countSpinners,
    },
    mods: s.mods,
    stars: stars ?? s.beatmap.difficultyRating,
    ar: s.beatmap.ar,
    cs: s.beatmap.cs,
    od: s.beatmap.od,
    hp: s.beatmap.hp,
    passed: s.passed,
    totalScore: s.totalScore,
    combo: s.maxCombo,
    accuracy: s.accuracy,
    pp: {
      value: s.pp ?? undefined,
      ifFc: undefined,
      ifSs: undefined,
    },
    statistics: statistics,
    grade: s.rank,
  };
}

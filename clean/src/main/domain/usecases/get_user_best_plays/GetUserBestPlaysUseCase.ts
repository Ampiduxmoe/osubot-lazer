import {UseCase} from '../UseCase';
import {CachedOsuUsersDao} from '../../../data/dao/CachedOsuUsersDao';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {ScoreSimulationsDao} from '../../../data/dao/ScoreSimulationsDao';
import {BeatmapStats} from '../../entities/BeatmapStats';
import {OsuServer} from '../../../../primitives/OsuServer';
import {
  BeatmapsetRankStatus,
  BestPlay,
  BestPlayStatisticsCtb,
  BestPlayStatisticsMania,
  BestPlayStatisticsTaiko,
  GetUserBestPlaysResponse,
} from './GetUserBestPlaysResponse';
import {GetUserBestPlaysRequest} from './GetUserBestPlaysRequest';
import {
  OsuUserBestScoresDao,
  UserBestScore,
} from '../../../data/dao/OsuUserBestScoresDao';

export class GetUserBestPlaysUseCase
  implements UseCase<GetUserBestPlaysRequest, GetUserBestPlaysResponse>
{
  userBestPlays: OsuUserBestScoresDao;
  scoreSimulations: ScoreSimulationsDao;
  cachedOsuUsers: CachedOsuUsersDao;
  osuUsers: OsuUsersDao;
  constructor(
    userBestPlays: OsuUserBestScoresDao,
    scoreSimulations: ScoreSimulationsDao,
    cachedOsuUsers: CachedOsuUsersDao,
    osuUsers: OsuUsersDao
  ) {
    this.userBestPlays = userBestPlays;
    this.scoreSimulations = scoreSimulations;
    this.cachedOsuUsers = cachedOsuUsers;
    this.osuUsers = osuUsers;
  }
  async execute(
    params: GetUserBestPlaysRequest
  ): Promise<GetUserBestPlaysResponse> {
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
    startPosition: number,
    quantity: number,
    mods: {
      acronym: string;
      isOptional: boolean;
    }[]
  ): Promise<GetUserBestPlaysResponse> {
    const ruleset = OsuRuleset.osu;
    const rawBestScores = await this.userBestPlays.get(
      appUserId,
      osuId,
      server,
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
    const bestPlayPromises = rawBestScores.map(async s => {
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
      const scoreSimulation = await this.scoreSimulations.getForOsu(
        s.beatmap.id,
        mods,
        s.maxCombo,
        fullPlayMisses,
        fullPlayMehs,
        fullPlayGoods,
        undefined
      );
      const moddedBeatmapStats = new BeatmapStats(
        s.beatmap.ar,
        s.beatmap.cs,
        s.beatmap.od,
        s.beatmap.hp
      );
      if (mods.find(m => m.toLowerCase() === 'hr')) {
        moddedBeatmapStats.applyHrMod();
      } else if (mods.find(m => m.toLowerCase() === 'ez')) {
        moddedBeatmapStats.applyEzMod();
      }

      if (mods.find(m => m.toLowerCase() === 'tp')) {
        moddedBeatmapStats.applyTpMod();
      }

      if (mods.find(m => ['ht', 'dc'].includes(m.toLowerCase()))) {
        moddedBeatmapStats.applyHtMod(undefined);
      } else if (mods.find(m => ['dt', 'nc'].includes(m.toLowerCase()))) {
        moddedBeatmapStats.applyDtMod(undefined);
      }

      const hasStarsChangingMods =
        mods.find(m => starsChangingMods.find(x => x === m.toLowerCase())) !==
        undefined;

      const osuUserBestScore: BestPlay = {
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
        pp: s.pp,
        statistics: {
          countGreat: counts.great,
          countOk: counts.ok,
          countMeh: counts.meh,
          countMiss: counts.miss,
        },
        grade: s.rank,
        date: Date.parse(s.endedAt),
      };
      return osuUserBestScore;
    });
    const bestPlays = await Promise.all(bestPlayPromises);
    return {
      isFailure: false,
      ruleset: ruleset,
      bestPlays: {
        username: username,
        plays: bestPlays,
      },
    };
  }

  async executeForTaiko(
    appUserId: string,
    server: OsuServer,
    username: string,
    osuId: number,
    startPosition: number,
    quantity: number,
    mods: {
      acronym: string;
      isOptional: boolean;
    }[]
  ): Promise<GetUserBestPlaysResponse> {
    const ruleset = OsuRuleset.taiko;
    const rawBestScores = await this.userBestPlays.get(
      appUserId,
      osuId,
      server,
      mods,
      quantity,
      startPosition,
      ruleset
    );
    const bestPlayPromises = rawBestScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const scoreSimulation = await this.scoreSimulations.getForTaiko(
        s.beatmap.id,
        mods
      );
      const maxCombo = scoreSimulation?.difficultyAttributes.maxCombo;
      const stars = scoreSimulation?.difficultyAttributes.starRating;
      return userBestScoreToBestPlay(s, ruleset, maxCombo, stars);
    });
    const bestPlays = await Promise.all(bestPlayPromises);
    return {
      isFailure: false,
      ruleset: ruleset,
      bestPlays: {
        username: username,
        plays: bestPlays,
      },
    };
  }

  async executeForCtb(
    appUserId: string,
    server: OsuServer,
    username: string,
    osuId: number,
    startPosition: number,
    quantity: number,
    mods: {
      acronym: string;
      isOptional: boolean;
    }[]
  ): Promise<GetUserBestPlaysResponse> {
    const ruleset = OsuRuleset.ctb;
    const rawBestScores = await this.userBestPlays.get(
      appUserId,
      osuId,
      server,
      mods,
      quantity,
      startPosition,
      ruleset
    );
    const bestPlayPromises = rawBestScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const scoreSimulation = await this.scoreSimulations.getForCtb(
        s.beatmap.id,
        mods
      );
      const maxCombo = scoreSimulation?.difficultyAttributes.maxCombo;
      const stars = scoreSimulation?.difficultyAttributes.starRating;
      return userBestScoreToBestPlay(s, ruleset, maxCombo, stars);
    });
    const bestPlays = await Promise.all(bestPlayPromises);
    return {
      isFailure: false,
      ruleset: ruleset,
      bestPlays: {
        username: username,
        plays: bestPlays,
      },
    };
  }

  async executeForMania(
    appUserId: string,
    server: OsuServer,
    username: string,
    osuId: number,
    startPosition: number,
    quantity: number,
    mods: {
      acronym: string;
      isOptional: boolean;
    }[]
  ): Promise<GetUserBestPlaysResponse> {
    const ruleset = OsuRuleset.mania;
    const rawBestScores = await this.userBestPlays.get(
      appUserId,
      osuId,
      server,
      mods,
      quantity,
      startPosition,
      ruleset
    );
    const bestPlayPromises = rawBestScores.map(async s => {
      const mods = s.mods.map(s => s.acronym);
      const scoreSimulation = await this.scoreSimulations.getForMania(
        s.beatmap.id,
        mods
      );
      const maxCombo = scoreSimulation?.difficultyAttributes.maxCombo;
      const stars = scoreSimulation?.difficultyAttributes.starRating;
      return userBestScoreToBestPlay(s, ruleset, maxCombo, stars);
    });
    const bestPlays = await Promise.all(bestPlayPromises);
    return {
      isFailure: false,
      ruleset: ruleset,
      bestPlays: {
        username: username,
        plays: bestPlays,
      },
    };
  }
}

function extractBeatmapsetRankStatus(
  score: UserBestScore
): BeatmapsetRankStatus {
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
function userBestScoreToBestPlay(
  s: UserBestScore,
  ruleset: OsuRuleset,
  maxCombo: number | undefined,
  stars: number | undefined
): BestPlay {
  let statistics:
    | BestPlayStatisticsTaiko
    | BestPlayStatisticsCtb
    | BestPlayStatisticsMania;
  if (ruleset === OsuRuleset.taiko) {
    const taikoStatistics: BestPlayStatisticsTaiko = {
      countGreat: s.statistics.great ?? 0,
      countOk: s.statistics.ok ?? 0,
      countMiss: s.statistics.miss ?? 0,
    };
    statistics = taikoStatistics;
  } else if (ruleset === OsuRuleset.ctb) {
    const ctbStatistics: BestPlayStatisticsCtb = {
      countGreat: s.statistics.great ?? 0,
      countLargeTickHit: s.statistics.largeTickHit ?? 0,
      countSmallTickHit: s.statistics.smallTickHit ?? 0,
      countSmallTickMiss: s.statistics.smallTickMiss ?? 0,
      countMiss: s.statistics.miss ?? 0,
    };
    statistics = ctbStatistics;
  } else if (ruleset === OsuRuleset.mania) {
    const maniaStatistics: BestPlayStatisticsMania = {
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
    pp: s.pp,
    statistics: statistics,
    grade: s.rank,
    date: Date.parse(s.endedAt),
  };
}

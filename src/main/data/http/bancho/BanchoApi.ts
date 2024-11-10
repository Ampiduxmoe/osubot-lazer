import {ModAcronym} from '../../../primitives/ModAcronym';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {OsuBeatmapInfo} from '../boundary/OsuBeatmapInfo';
import {OsuBeatmapsetInfo} from '../boundary/OsuBeatmapsetInfo';
import {OsuBeatmapUserScoreInfo} from '../boundary/OsuBeatmapUserScoreInfo';
import {OsuUserBestScoreInfo} from '../boundary/OsuUserBestScoreInfo';
import {OsuUserInfo} from '../boundary/OsuUserInfo';
import {OsuUserRecentScoreInfo} from '../boundary/OsuUserRecentScoreInfo';
import {OsuApi} from '../OsuApi';
import {BanchoClient} from './client/BanchoClient';
import {RawBanchoBeatmapExtended} from './client/beatmaps/RawBanchoBeatmapExtended';
import {RawBanchoBeatmapUserScore} from './client/beatmaps/RawBanchoBeatmapUserScore';
import {RawBanchoBeatmapsetExtended} from './client/beatmapsets/RawBanchoBeatmapsetExtended';
import {MaximumStatistics} from './client/common_types/MaximumStatistics';
import {Mod} from './client/common_types/Mod';
import {Playmode} from './client/common_types/Playmode';
import {ScoreStatistics} from './client/common_types/ScoreStatistics';
import {RawBanchoUserBestScore} from './client/users/RawBanchoUserBestScore';
import {RawBanchoUserRecentScore} from './client/users/RawBanchoUserRecentScore';

export class BanchoApi implements OsuApi {
  private client: BanchoClient;
  constructor(client: BanchoClient) {
    this.client = client;
  }

  server = OsuServer.Bancho;

  async getUser(
    username: string,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserInfo | undefined> {
    const user = await this.client.users.getByUsername(username, ruleset);
    if (user === undefined) {
      return undefined;
    }
    return {
      id: user.id,
      username: user.username,
      preferredMode: playmodeToRuleset(user.playmode),
      countryCode: user.country_code,
      rankGlobal: user.statistics.global_rank || null,
      rankGlobalHighest:
        user.rank_highest === null
          ? undefined
          : {
              value: user.rank_highest.rank,
              date: String(user.rank_highest.updated_at),
            },
      rankCountry: user.statistics.country_rank || null,
      playcount: user.statistics.play_count,
      level: user.statistics.level.current,
      playtime: user.statistics.play_time,
      pp: user.statistics.pp,
      accuracy: user.statistics.hit_accuracy,
    };
  }

  async getUserRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserRecentScoreInfo[]> {
    const scores = await this.client.users.getRecentScores(
      osuUserId,
      includeFails,
      quantity,
      startPosition,
      ruleset
    );
    return scores.map(s => {
      return userRecentScoreInternalToExternal(s);
    });
  }

  async getUserBestPlays(
    osuUserId: number,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuUserBestScoreInfo[]> {
    const scores = await this.client.users.getBestScores(
      osuUserId,
      quantity,
      startPosition,
      ruleset
    );
    return scores.map(s => {
      return userBestScoreInternalToExternal(s);
    });
  }

  async getBeatmap(beatmapId: number): Promise<OsuBeatmapInfo | undefined> {
    const beatmap = await this.client.beatmaps.getById(beatmapId);
    if (beatmap === undefined) {
      return undefined;
    }
    return beatmapInternalToExternal(beatmap);
  }

  async getBeatmapUserScores(
    beatmapId: number,
    osuUserId: number,
    ruleset: OsuRuleset | undefined
  ): Promise<OsuBeatmapUserScoreInfo[] | undefined> {
    const scores = await this.client.beatmaps.getUserScores(
      beatmapId,
      osuUserId,
      ruleset
    );
    if (scores === undefined) {
      return undefined;
    }
    return scores.map(s => beatmapUserScoreInternalToExternal(s));
  }

  async getBeatmapset(
    beatmapsetId: number
  ): Promise<OsuBeatmapsetInfo | undefined> {
    const beatmapset = await this.client.beatmapsets.getById(beatmapsetId);
    if (beatmapset === undefined) {
      return undefined;
    }
    return beatmapsetInternalToExternal(beatmapset);
  }
}

function playmodeToRuleset(playmode: Playmode): OsuRuleset {
  switch (playmode) {
    case 'osu':
      return OsuRuleset.osu;
    case 'taiko':
      return OsuRuleset.taiko;
    case 'fruits':
      return OsuRuleset.ctb;
    case 'mania':
      return OsuRuleset.mania;
  }
}

function userRecentScoreInternalToExternal(
  score: RawBanchoUserRecentScore
): OsuUserRecentScoreInfo {
  return {
    id: score.id,
    userId: score.user_id,
    mods: score.mods.map(m => modInternalToExternal(m)),
    maximumStatistics: maximumStatisticsInternalToExternal(
      score.maximum_statistics
    ),
    statistics: scoreStatisticsInternalToExternal(score.statistics),
    rank: score.rank,
    accuracy: score.accuracy,
    startedAt: score.started_at as string | null,
    endedAt: score.ended_at as string,
    isPerfectCombo: score.is_perfect_combo,
    maxCombo: score.max_combo,
    passed: score.passed,
    pp: score.pp,
    totalScore: score.total_score,
    beatmap: {
      id: score.beatmap.id,
      userId: score.beatmap.user_id,
      version: score.beatmap.version,
      totalLength: score.beatmap.total_length,
      hitLength: score.beatmap.hit_length,
      difficultyRating: score.beatmap.difficulty_rating,
      bpm: score.beatmap.bpm,
      ar: score.beatmap.ar,
      cs: score.beatmap.cs,
      od: score.beatmap.accuracy,
      hp: score.beatmap.drain,
      countCircles: score.beatmap.count_circles,
      countSliders: score.beatmap.count_sliders,
      countSpinners: score.beatmap.count_spinners,
      url: score.beatmap.url,
    },
    beatmapset: {
      id: score.beatmapset.id,
      userId: score.beatmapset.user_id,
      creator: score.beatmapset.creator,
      artist: score.beatmapset.artist,
      title: score.beatmapset.title,
      coverUrl: `https://assets.ppy.sh/beatmaps/${score.beatmapset.id}/covers/raw.jpg`,
      status: score.beatmapset.status,
    },
    user: {
      id: score.user.id,
      username: score.user.username,
    },
  };
}

function userBestScoreInternalToExternal(
  score: RawBanchoUserBestScore
): OsuUserBestScoreInfo {
  return {
    id: score.id,
    userId: score.user_id,
    mods: score.mods.map(m => modInternalToExternal(m)),
    maximumStatistics: maximumStatisticsInternalToExternal(
      score.maximum_statistics
    ),
    statistics: scoreStatisticsInternalToExternal(score.statistics),
    rank: score.rank,
    accuracy: score.accuracy,
    startedAt: score.started_at as string | null,
    endedAt: score.ended_at as string,
    isPerfectCombo: score.is_perfect_combo,
    maxCombo: score.max_combo,
    passed: score.passed,
    pp: score.pp,
    totalScore: score.total_score,
    beatmap: {
      id: score.beatmap.id,
      userId: score.beatmap.user_id,
      version: score.beatmap.version,
      totalLength: score.beatmap.total_length,
      hitLength: score.beatmap.hit_length,
      difficultyRating: score.beatmap.difficulty_rating,
      bpm: score.beatmap.bpm,
      ar: score.beatmap.ar,
      cs: score.beatmap.cs,
      od: score.beatmap.accuracy,
      hp: score.beatmap.drain,
      countCircles: score.beatmap.count_circles,
      countSliders: score.beatmap.count_sliders,
      countSpinners: score.beatmap.count_spinners,
      url: score.beatmap.url,
    },
    beatmapset: {
      id: score.beatmapset.id,
      userId: score.beatmapset.user_id,
      creator: score.beatmapset.creator,
      artist: score.beatmapset.artist,
      title: score.beatmapset.title,
      coverUrl: `https://assets.ppy.sh/beatmaps/${score.beatmapset.id}/covers/raw.jpg`,
      status: score.beatmapset.status,
    },
    user: {
      id: score.user.id,
      username: score.user.username,
    },
  };
}

function beatmapInternalToExternal(
  beatmap: RawBanchoBeatmapExtended
): OsuBeatmapInfo {
  return {
    beatmapsetId: beatmap.beatmapset_id,
    difficultyRating: beatmap.difficulty_rating,
    id: beatmap.id,
    mode: playmodeToRuleset(beatmap.mode),
    totalLength: beatmap.total_length,
    userId: beatmap.user_id,
    version: beatmap.version,
    ar: beatmap.ar,
    cs: beatmap.cs,
    od: beatmap.accuracy,
    hp: beatmap.drain,
    bpm: beatmap.bpm,
    convert: beatmap.convert,
    countCircles: beatmap.count_circles,
    countSliders: beatmap.count_sliders,
    countSpinners: beatmap.count_spinners,
    deletedAt:
      beatmap.deleted_at === null
        ? null
        : Date.parse(beatmap.deleted_at as string),
    hitLength: beatmap.hit_length,
    lastUpdated: Date.parse(beatmap.last_updated as string),
    passcount: beatmap.passcount,
    playcount: beatmap.playcount,
    url: beatmap.url,
    beatmapset: {
      artist: beatmap.beatmapset.artist,
      coverUrl: `https://assets.ppy.sh/beatmaps/${beatmap.beatmapset.id}/covers/raw.jpg`,
      creator: beatmap.beatmapset.creator,
      favouriteCount: beatmap.beatmapset.favourite_count,
      hype: beatmap.beatmapset.hype,
      id: beatmap.beatmapset.id,
      nsfw: beatmap.beatmapset.nsfw,
      offset: beatmap.beatmapset.offset,
      playcount: beatmap.beatmapset.play_count,
      previewUrl: beatmap.beatmapset.preview_url,
      source: beatmap.beatmapset.source,
      spotlight: beatmap.beatmapset.spotlight,
      status: beatmap.beatmapset.status,
      title: beatmap.beatmapset.title,
      userId: beatmap.beatmapset.user_id,
      video: beatmap.beatmapset.video,
      bpm: beatmap.beatmapset.bpm,
      deletedAt:
        beatmap.beatmapset.deleted_at === null
          ? null
          : Date.parse(beatmap.beatmapset.deleted_at as string),
      lastUpdated: Date.parse(beatmap.beatmapset.last_updated as string),
      rankedDate: Date.parse(beatmap.beatmapset.ranked_date as string),
      storyboard: beatmap.beatmapset.storyboard,
      submittedDate: Date.parse(beatmap.beatmapset.submitted_date as string),
      tags: beatmap.beatmapset.tags,
      availability: {
        downloadDisabled: beatmap.beatmapset.availability.download_disabled,
        moreInformation: beatmap.beatmapset.availability.more_information,
      },
      ratings: beatmap.beatmapset.ratings,
    },
    failtimes: {
      fail: beatmap.failtimes.fail,
      exit: beatmap.failtimes.exit,
    },
    maxCombo: beatmap.max_combo,
  };
}

function beatmapUserScoreInternalToExternal(
  score: RawBanchoBeatmapUserScore
): OsuBeatmapUserScoreInfo {
  return {
    id: score.id,
    userId: score.user_id,
    mods: score.mods.map(m => modInternalToExternal(m)),
    maximumStatistics: maximumStatisticsInternalToExternal(
      score.maximum_statistics
    ),
    statistics: scoreStatisticsInternalToExternal(score.statistics),
    rank: score.rank,
    accuracy: score.accuracy,
    startedAt: score.started_at as string | null,
    endedAt: score.ended_at as string,
    isPerfectCombo: score.is_perfect_combo,
    maxCombo: score.max_combo,
    passed: score.passed,
    pp: score.pp,
    totalScore: score.total_score,
  };
}

function modInternalToExternal(mod: Mod): {
  acronym: ModAcronym;
  settings?: {
    speedChange?: number;
    adjustPitch?: boolean;
    ar?: number;
    cs?: number;
    od?: number;
    hp?: number;
    retries?: number;
    seed?: number;
    metronome?: boolean;
  };
} {
  return {
    acronym: new ModAcronym(mod.acronym),
    settings:
      mod.settings === undefined
        ? undefined
        : {
            speedChange: mod.settings.speed_change,
            adjustPitch: mod.settings.adjust_pitch,
            ar: mod.settings.approach_rate,
            cs: mod.settings.circle_size,
            od: mod.settings.overall_difficulty,
            hp: mod.settings.drain_rate,
            retries: mod.settings.retries,
            seed: mod.settings.seed,
            metronome: mod.settings.metronome,
          },
  };
}

function maximumStatisticsInternalToExternal(statistics: MaximumStatistics): {
  great?: number;
  perfect?: number;
  legacyComboIncrease?: number;
  ignoreHit?: number;
  largeBonus?: number;
  smallBonus?: number;
  largeTickHit?: number;
  smallTickHit?: number;
  sliderTailHit?: number;
} {
  return {
    great: statistics.great,
    perfect: statistics.perfect,
    legacyComboIncrease: statistics.legacy_combo_increase,
    ignoreHit: statistics.ignore_hit,
    largeBonus: statistics.large_bonus,
    smallBonus: statistics.small_bonus,
    largeTickHit: statistics.large_tick_hit,
    smallTickHit: statistics.small_tick_hit,
    sliderTailHit: statistics.slider_tail_hit,
  };
}

function scoreStatisticsInternalToExternal(statistics: ScoreStatistics): {
  great?: number;
  ok?: number;
  meh?: number;
  miss?: number;
  largeTickHit?: number;
  largeTickMiss?: number;
  smallTickHit?: number;
  smallTickMiss?: number;
  perfect?: number;
  good?: number;
} {
  return {
    great: statistics.great,
    ok: statistics.ok,
    meh: statistics.meh,
    miss: statistics.miss,
    largeTickHit: statistics.large_tick_hit,
    smallTickHit: statistics.small_tick_hit,
    smallTickMiss: statistics.small_tick_miss,
    perfect: statistics.perfect,
    good: statistics.good,
  };
}

function beatmapsetInternalToExternal(
  beatmapset: RawBanchoBeatmapsetExtended
): OsuBeatmapsetInfo {
  return {
    artist: beatmapset.artist,
    coverUrl: `https://assets.ppy.sh/beatmapsets/${beatmapset.id}/covers/raw.jpg`,
    creator: beatmapset.creator,
    favouriteCount: beatmapset.favourite_count,
    hype: beatmapset.hype,
    id: beatmapset.id,
    nsfw: beatmapset.nsfw,
    offset: beatmapset.offset,
    playcount: beatmapset.play_count,
    previewUrl: beatmapset.preview_url,
    source: beatmapset.source,
    spotlight: beatmapset.spotlight,
    status: beatmapset.status,
    title: beatmapset.title,
    userId: beatmapset.user_id,
    video: beatmapset.video,
    bpm: beatmapset.bpm,
    deletedAt:
      beatmapset.deleted_at === null
        ? null
        : Date.parse(beatmapset.deleted_at as string),
    lastUpdated: Date.parse(beatmapset.last_updated as string),
    rankedDate: Date.parse(beatmapset.ranked_date as string),
    storyboard: beatmapset.storyboard,
    submittedDate: Date.parse(beatmapset.submitted_date as string),
    tags: beatmapset.tags,
    availability: {
      downloadDisabled: beatmapset.availability.download_disabled,
      moreInformation: beatmapset.availability.more_information,
    },
    ratings: beatmapset.ratings,
    beatmaps: beatmapset.beatmaps.map(map => ({
      beatmapsetId: map.beatmapset_id,
      difficultyRating: map.difficulty_rating,
      id: map.id,
      mode: playmodeToRuleset(map.mode),
      totalLength: map.total_length,
      userId: map.user_id,
      version: map.version,
      ar: map.ar,
      cs: map.cs,
      od: map.accuracy,
      hp: map.drain,
      bpm: map.bpm,
      convert: map.convert,
      countCircles: map.count_circles,
      countSliders: map.count_sliders,
      countSpinners: map.count_spinners,
      deletedAt:
        map.deleted_at === null ? null : Date.parse(map.deleted_at as string),
      hitLength: map.hit_length,
      lastUpdated: Date.parse(map.last_updated as string),
      passcount: map.passcount,
      playcount: map.playcount,
      url: map.url,
      failtimes: {
        fail: map.failtimes.fail,
        exit: map.failtimes.exit,
      },
      maxCombo: map.max_combo,
    })),
  };
}

import {OsuApi} from '../OsuApi';
import {OsuServer} from '../../../../primitives/OsuServer';
import {BanchoClient} from './client/BanchoClient';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuUserInfo} from '../boundary/OsuUserInfo';
import {OsuUserRecentScoreInfo} from '../boundary/OsuUserRecentScoreInfo';
import {Playmode} from './client/common_types/Playmode';
import {RawBanchoUserRecentScore} from './client/users/RawBanchoUserRecentScore';
import {RawBanchoUserBestScore} from './client/users/RawBanchoUserBestScore';
import {OsuUserBestScoreInfo} from '../boundary/OsuUserBestScoreInfo';
import {ModAcronym} from '../../../../primitives/ModAcronym';
import {OsuBeatmapInfo} from '../boundary/OsuBeatmapInfo';
import {RawBanchoBeatmapExtended} from './client/beatmaps/RawBanchoBeatmapExtended';

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
    default:
      throw Error('Unknown playmode');
  }
}

function userRecentScoreInternalToExternal(
  score: RawBanchoUserRecentScore
): OsuUserRecentScoreInfo {
  return {
    id: score.id,
    userId: score.user_id,
    mods: score.mods.map(m => ({
      acronym: new ModAcronym(m.acronym),
      settings:
        m.settings === undefined
          ? undefined
          : {
              speedChange: m.settings.speed_change,
              adjustPitch: m.settings.adjust_pitch,
              ar: m.settings.approach_rate,
              cs: m.settings.circle_size,
              od: m.settings.overall_difficulty,
              hp: m.settings.drain_rate,
              retries: m.settings.retries,
              seed: m.settings.seed,
              metronome: m.settings.metronome,
            },
    })),
    maximumStatistics: {
      great: score.maximum_statistics.great,
      perfect: score.maximum_statistics.perfect,
      legacyComboIncrease: score.maximum_statistics.legacy_combo_increase,
      ignoreHit: score.maximum_statistics.ignore_hit,
      largeBonus: score.maximum_statistics.large_bonus,
      smallBonus: score.maximum_statistics.small_bonus,
      largeTickHit: score.maximum_statistics.large_tick_hit,
      smallTickHit: score.maximum_statistics.small_tick_hit,
      sliderTailHit: score.maximum_statistics.slider_tail_hit,
    },
    statistics: {
      great: score.statistics.great,
      ok: score.statistics.ok,
      meh: score.statistics.meh,
      miss: score.statistics.miss,
      largeTickHit: score.statistics.large_tick_hit,
      smallTickHit: score.statistics.small_tick_hit,
      smallTickMiss: score.statistics.small_tick_miss,
      perfect: score.statistics.perfect,
      good: score.statistics.good,
    },
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
      coverUrl: score.beatmapset.covers.cover,
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
    mods: score.mods.map(m => ({
      acronym: new ModAcronym(m.acronym),
      settings:
        m.settings === undefined
          ? undefined
          : {
              speedChange: m.settings.speed_change,
              adjustPitch: m.settings.adjust_pitch,
              ar: m.settings.approach_rate,
              cs: m.settings.circle_size,
              od: m.settings.overall_difficulty,
              hp: m.settings.drain_rate,
              retries: m.settings.retries,
              seed: m.settings.seed,
              metronome: m.settings.metronome,
            },
    })),
    maximumStatistics: {
      great: score.maximum_statistics.great,
      perfect: score.maximum_statistics.perfect,
      legacyComboIncrease: score.maximum_statistics.legacy_combo_increase,
      ignoreHit: score.maximum_statistics.ignore_hit,
      largeBonus: score.maximum_statistics.large_bonus,
      smallBonus: score.maximum_statistics.small_bonus,
      largeTickHit: score.maximum_statistics.large_tick_hit,
      smallTickHit: score.maximum_statistics.small_tick_hit,
      sliderTailHit: score.maximum_statistics.slider_tail_hit,
    },
    statistics: {
      great: score.statistics.great,
      ok: score.statistics.ok,
      meh: score.statistics.meh,
      miss: score.statistics.miss,
      largeTickHit: score.statistics.large_tick_hit,
      largeTickMiss: score.statistics.large_tick_miss,
      smallTickHit: score.statistics.small_tick_hit,
      smallTickMiss: score.statistics.small_tick_miss,
      perfect: score.statistics.perfect,
      good: score.statistics.good,
    },
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
      coverUrl: score.beatmapset.covers.cover,
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
      coverUrl: beatmap.beatmapset.covers.cover,
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

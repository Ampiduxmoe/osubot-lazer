import {OsuApi} from '../OsuAPI';
import {OsuServer} from '../../../../primitives/OsuServer';
import {BanchoClient} from './client/BanchoClient';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuUserInfo} from '../boundary/OsuUserInfo';
import {RecentScoreInfo} from '../boundary/RecentScoreInfo';
import {Playmode} from './client/common_types/Playmode';
import {RecentScore} from './client/users/RecentScore';
import {BestScore} from './client/users/BestScore';
import {UserBestScoreInfo} from '../boundary/UserBestScoreInfo';

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

  async getRecentPlays(
    osuUserId: number,
    includeFails: boolean,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RecentScoreInfo[]> {
    const scores = await this.client.users.getRecentScores(
      osuUserId,
      includeFails,
      quantity,
      startPosition,
      ruleset
    );
    return scores.map(s => {
      return recentScoreInternalToExternal(s);
    });
  }

  async getUserBest(
    osuUserId: number,
    quantity: number,
    startPosition: number,
    ruleset: OsuRuleset | undefined
  ): Promise<RecentScoreInfo[]> {
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

function recentScoreInternalToExternal(score: RecentScore): RecentScoreInfo {
  return {
    id: score.id,
    userId: score.user_id,
    mods: score.mods,
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

function userBestScoreInternalToExternal(score: BestScore): UserBestScoreInfo {
  return {
    id: score.id,
    userId: score.user_id,
    mods: score.mods,
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

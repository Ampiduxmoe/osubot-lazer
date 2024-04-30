import {OsuApi} from '../OsuAPI';
import {OsuServer} from '../../../../../primitives/OsuServer';
import {BanchoClient} from './client/BanchoClient';
import {OsuRuleset} from '../../../../../primitives/OsuRuleset';
import {OsuUserInfo} from '../boundary/OsuUserInfo';
import {RecentScoreInfo} from '../boundary/RecentScoreInfo';

export class BanchoApi implements OsuApi {
  private client: BanchoClient;
  constructor(ouathClientId: number, oauthClientSecret: string) {
    this.client = new BanchoClient(ouathClientId, oauthClientSecret);
  }

  server: OsuServer = OsuServer.Bancho;

  async getUser(
    username: string,
    ruleset: OsuRuleset
  ): Promise<OsuUserInfo | undefined> {
    const user = await this.client.users.getByUsername(username, ruleset);
    if (user === undefined) {
      return undefined;
    }
    return {
      id: user.id,
      username: user.username,
      countryCode: user.country_code,
      rankGlobal: user.statistics.global_rank || null,
      rankGlobalHighest:
        user.rank_highest === null
          ? undefined
          : {
              value: user.rank_highest!.rank,
              date: String(user.rank_highest!.updated_at),
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
    ruleset: OsuRuleset
  ): Promise<RecentScoreInfo[]> {
    const scores = await this.client.users.getRecentScores(
      osuUserId,
      includeFails,
      quantity,
      startPosition,
      ruleset
    );
    return scores.map(s => {
      const scoreInfo: RecentScoreInfo = {
        id: s.id,
        userId: s.user_id,
        mods: s.mods,
        statistics: {
          great: s.statistics.great || 0,
          ok: s.statistics.ok || 0,
          meh: s.statistics.meh || 0,
          miss: s.statistics.miss || 0,
        },
        rank: s.rank,
        accuracy: s.accuracy,
        startedAt: s.started_at as string | null,
        endedAt: s.ended_at as string,
        isPerfectCombo: s.is_perfect_combo,
        maxCombo: s.max_combo,
        passed: s.passed,
        pp: s.pp,
        totalScore: s.total_score,
        beatmap: {
          id: s.beatmap.id,
          userId: s.beatmap.user_id,
          version: s.beatmap.version,
          totalLength: s.beatmap.total_length,
          hitLength: s.beatmap.hit_length,
          difficultyRating: s.beatmap.difficulty_rating,
          bpm: s.beatmap.bpm,
          ar: s.beatmap.ar,
          cs: s.beatmap.cs,
          od: s.beatmap.accuracy,
          hp: s.beatmap.drain,
          countCircles: s.beatmap.count_circles,
          countSliders: s.beatmap.count_sliders,
          countSpinners: s.beatmap.count_spinners,
          url: s.beatmap.url,
        },
        beatmapset: {
          id: s.beatmapset.id,
          userId: s.beatmapset.user_id,
          creator: s.beatmapset.creator,
          artist: s.beatmapset.artist,
          title: s.beatmapset.title,
          coverUrl: s.beatmapset.covers.cover,
          status: s.beatmapset.status,
        },
        user: {
          id: s.user.id,
          username: s.user.username,
        },
      };
      return scoreInfo;
    });
  }
}

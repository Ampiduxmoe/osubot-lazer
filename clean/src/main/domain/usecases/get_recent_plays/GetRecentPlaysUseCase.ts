import {UseCase} from '../UseCase';
import {GetRecentPlaysRequest} from './GetRecentPlaysRequest';
import {GetRecentPlaysResponse, RecentPlay} from './GetRecentPlaysResponse';
import {OsuRecentScoresDao} from '../../../data/dao/OsuRecentScoresDao';
import {CachedOsuIdsDao} from '../../../data/dao/CachedOsuIdsDao';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';

export class GetRecentPlaysUseCase
  implements UseCase<GetRecentPlaysRequest, GetRecentPlaysResponse>
{
  recentScores: OsuRecentScoresDao;
  cachedOsuIds: CachedOsuIdsDao;
  osuUsers: OsuUsersDao;
  constructor(
    recentScores: OsuRecentScoresDao,
    cachedOsuIds: CachedOsuIdsDao,
    osuUsers: OsuUsersDao
  ) {
    this.recentScores = recentScores;
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
    const rawRecentScores = await this.recentScores.getByUserId(
      osuId,
      server,
      params.includeFails,
      params.startPosition,
      params.quantity
    );
    const recentPlays = rawRecentScores.map(() => {
      const osuUserRecentScore: RecentPlay = {
        beatmapset: {
          status: 'Ranked',
          artist: '',
          title: '',
          creator: '',
        },
        beatmap: {
          difficultyName: '',
          length: NaN,
          bpm: NaN,
          stars: NaN,
          ar: NaN,
          cs: NaN,
          od: NaN,
          hp: NaN,
          maxCombo: NaN,
          url: '',
        },
        mods: [],
        totalScore: NaN,
        combo: NaN,
        accuracy: NaN,
        pp: {
          value: NaN,
          ifFc: NaN,
          ifSs: NaN,
        },
        grade: 'F',
      };
      return osuUserRecentScore;
    });
    return {
      isFailure: false,
      recentPlays: {
        username: caseCorrectUsername,
        plays: recentPlays,
      },
    };
  }
}

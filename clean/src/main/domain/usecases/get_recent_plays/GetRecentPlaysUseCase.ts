import {UseCase} from '../UseCase';
import {GetRecentPlaysRequest} from './GetRecentPlaysRequest';
import {GetRecentPlaysResponse, RecentPlay} from './GetRecentPlaysResponse';
import {OsuRecentScoresDao} from '../../../data/dao/OsuRecentScoresDao';
import {CachedOsuIdsDao} from '../../../data/dao/CachedOsuIdsDao';
import {OsuUsersDao} from '../../../data/dao/OsuUsersDao';

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
      const osuUser = await this.osuUsers.getByUsername(username, server);
      if (osuUser === undefined) {
        return {
          isFailure: true,
          failureReason: 'user not found',
        };
      }
      osuId = osuUser.id;
      caseCorrectUsername = osuUser.username;
    }
    const rawRecentScores = await this.recentScores.getByUserId(
      osuId,
      server,
      params.includeFails,
      params.startPosition,
      params.quantity
    );
    const recentPlays = rawRecentScores.map(s => {
      const osuUserRecentScore: RecentPlay = {
        score: s.score,
        pp: s.pp || 0,
        accuracy: s.accuracy,
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

/* eslint-disable prefer-arrow-callback */

describe('Data', function () {
  describe('Tables', function () {
    require('./data/raw/db/tables/AppUserApiRequestsCounts.test');
    require('./data/raw/db/tables/AppUsers.test');
    require('./data/raw/db/tables/JsonObjects.test');
    require('./data/raw/db/tables/OsuUserSnapshots.test');
    require('./data/raw/db/tables/TimeWindows.test');
  });
  describe('DAOs', function () {
    require('./data/dao/AppUserApiRequestsSummariesDao.test');
    require('./data/dao/AppUserRecentApiRequestsDao.test');
    require('./data/dao/AppUsersDao.test');
    require('./data/dao/CachedOsuUsersDao.test');
    require('./data/dao/OsuRecentScoresDao.test');
    require('./data/dao/OsuUserBestScoresDao.test');
    require('./data/dao/OsuUsersDao.test');
    require('./data/dao/ScoreSimulationsDao.test');
  });
});

describe('Domain', function () {
  describe('Usecases', function () {
    require('./domain/usecases/GetApiUsageSummaryUseCase.test');
    require('./domain/usecases/GetAppUserInfoUseCase.test');
    require('./domain/usecases/GetOsuUserInfoUseCase.test');
    require('./domain/usecases/GetRecentPlaysUseCase.test');
    require('./domain/usecases/GetUserBestPlaysUseCase.test');
    require('./domain/usecases/SetUsernameUseCase.test');
  });
});

describe('Presentation', function () {
  describe('Commands', function () {
    require('./presentation/UserBestPlays.test');
    require('./presentation/UserInfo.test');
    require('./presentation/UserRecentPlays.test');
  });
});

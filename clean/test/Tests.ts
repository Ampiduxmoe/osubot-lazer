/* eslint-disable prefer-arrow-callback */

describe('Primitives', function () {
  require('./primitives/ModAcronym.test');
});

describe('Data', function () {
  describe('Tables', function () {
    require('./data/persistence/db/tables/AppUserApiRequestsCounts.test');
    require('./data/persistence/db/tables/AppUsers.test');
    require('./data/persistence/db/tables/JsonObjects.test');
    require('./data/persistence/db/tables/OsuUserSnapshots.test');
    require('./data/persistence/db/tables/TimeWindows.test');
  });
  describe('DAOs', function () {
    require('./data/dao/AppUserApiRequestsSummariesDao.test');
    require('./data/dao/AppUserRecentApiRequestsDao.test');
    require('./data/dao/AppUsersDao.test');
    require('./data/dao/CachedOsuUsersDao.test');
    require('./data/dao/OsuUserBestScoresDao.test');
    require('./data/dao/OsuUserRecentScoresDao.test');
    require('./data/dao/OsuUsersDao.test');
    require('./data/dao/ScoreSimulationsDao.test');
  });
});

describe('Application', function () {
  describe('Usecases', function () {
    require('./application/usecases/GetApiUsageSummaryUseCase.test');
    require('./application/usecases/GetAppUserInfoUseCase.test');
    require('./application/usecases/GetOsuUserInfoUseCase.test');
    require('./application/usecases/GetUserBestPlaysUseCase.test');
    require('./application/usecases/GetUserRecentPlaysUseCase.test');
    require('./application/usecases/SetUsernameUseCase.test');
  });
});

describe('Presentation', function () {
  describe('Common', function () {
    describe('Arg processing', function () {
      require('./presentation/common/arg_processing/TextProcessor.test');
    });
  });
  describe('VK', function () {
    describe('Commands', function () {
      require('./presentation/vk/commands/UserBestPlays.test');
      require('./presentation/vk/commands/UserInfo.test');
      require('./presentation/vk/commands/UserRecentPlays.test');
    });
  });
});

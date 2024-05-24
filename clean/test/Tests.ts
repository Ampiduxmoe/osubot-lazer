/* eslint-disable prefer-arrow-callback */

describe('Data', function () {
  describe('Tables', function () {
    require('./data/raw/db/tables/AppUserApiRequestsCounts.test');
    require('./data/raw/db/tables/AppUsers.test');
    require('./data/raw/db/tables/OsuIdsAndUsernames.test');
    require('./data/raw/db/tables/TimeWindows.test');
  });
  describe('DAOs', function () {
    require('./data/dao/OsuUsersDao.test');
    require('./data/dao/ScoreSimulationsDao.test');
  });
});

describe('Domain', function () {
  describe('Usecases', function () {
    require('./domain/usecases/GetAppUserInfoUseCase.test');
    require('./domain/usecases/GetOsuUserInfoUseCase.test');
  });
});

describe('Presentation', function () {
  describe('Commands', function () {
    require('./presentation/UserInfo.test');
  });
});

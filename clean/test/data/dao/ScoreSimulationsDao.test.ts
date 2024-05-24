/* eslint-disable prefer-arrow-callback */

import assert = require('assert');
import {ScoreSimulationsDaoImpl} from '../../../src/main/data/dao/ScoreSimulationsDaoImpl';
import {FakeScoreSimulationApi} from '../../mocks/ScoreSimulationApi';

describe('ScoreSimulationsDaoImpl', function () {
  const scoreSimApi = new FakeScoreSimulationApi();
  const dao = new ScoreSimulationsDaoImpl(scoreSimApi);
  describe('#get()', function () {
    it('should return ScoreSimulationInfo', async function () {
      const result = await dao.get(34567, ['HD', 'NF'], null, 2, 4, 9, {
        difficultyAdjust: {ar: 8},
      });
      assert.notEqual(
        result.score &&
          result.difficultyAttributes &&
          result.performanceAttributes,
        undefined
      );
    });
  });
});

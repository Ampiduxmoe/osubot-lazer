/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {FakeScoreSimulationApi} from '../../mocks/data/raw/http/ScoreSimulationApi';
import {ScoreSimulationsDao} from '../../../src/main/data/dao/ScoreSimulationsDao';
import {ScoreSimulationsDaoImpl} from '../../../src/main/data/dao/ScoreSimulationsDaoImpl';

describe('ScoreSimulationsDao', function () {
  const scoreSimApi = new FakeScoreSimulationApi();
  const dao: ScoreSimulationsDao = new ScoreSimulationsDaoImpl(scoreSimApi);
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

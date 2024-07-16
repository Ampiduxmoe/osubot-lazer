/* eslint-disable prefer-arrow-callback */

import assert from 'assert';
import {ModAcronym} from '../../main/primitives/ModAcronym';

describe('ModAcronym', function () {
  describe('#toString()', function () {
    it('should return uppercase string', async function () {
      const acronym = new ModAcronym('hd');
      assert.strictEqual(acronym.toString(), 'HD');
    });
  });
  describe('#is()', function () {
    it('should return false when semantically different ModAcronym is passed', async function () {
      const acronym = new ModAcronym('hd');
      assert.strictEqual(acronym.is('dt'), false);
    });
    it('should return false when semantically different string is passed', async function () {
      const acronym1 = new ModAcronym('hd');
      const acronym2 = new ModAcronym('dt');
      assert.strictEqual(acronym1.is(acronym2), false);
    });
    it('should return true when semantically same ModAcronym is passed', async function () {
      const acronym = new ModAcronym('hd');
      assert.strictEqual(acronym.is('hd'), true);
      assert.strictEqual(acronym.is('HD'), true);
      assert.strictEqual(acronym.is('Hd'), true);
    });
    it('should return true when semantically same string acronym is passed', async function () {
      const acronym = new ModAcronym('hd');
      assert.strictEqual(acronym.is('hd'), true);
      assert.strictEqual(acronym.is('HD'), true);
      assert.strictEqual(acronym.is('Hd'), true);
    });
  });
  describe('#isAnyOf()', function () {
    it('should return false when there is no matching ModAcronym passed', async function () {
      const acronym = new ModAcronym('hd');
      const acronyms = ModAcronym.createMany('hr', 'dt', 'cl');
      assert.strictEqual(acronym.isAnyOf(...acronyms), false);
    });
    it('should return false when there is no matching string passed', async function () {
      const acronym = new ModAcronym('hd');
      assert.strictEqual(acronym.isAnyOf('hr', 'dt', 'cl'), false);
    });
    it('should return true when there is a matching ModAcronym passed', async function () {
      const acronym = new ModAcronym('hd');
      const acronyms = ModAcronym.createMany('hr', 'dt', 'hD', 'cl');
      assert.strictEqual(acronym.isAnyOf(...acronyms), true);
    });
    it('should return true when there is a matching string acronym passed', async function () {
      const acronym = new ModAcronym('hd');
      assert.strictEqual(acronym.isAnyOf('hr', 'dt', 'hD', 'cl'), true);
    });
  });
});

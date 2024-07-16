/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {MainTextProcessor} from '../../../../main/presentation/common/arg_processing/MainTextProcessor';

describe('TextProcessor', function () {
  const textProcessor = new MainTextProcessor(' ', "'", '\\');
  describe('#tokenize()', function () {
    it('should return single token for text "foo"', function () {
      const tokens = textProcessor.tokenize('foo');
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it('should return two tokens for text "foo bar"', function () {
      const tokens = textProcessor.tokenize('foo bar');
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it('should return three tokens for text "foo bar baz"', function () {
      const tokens = textProcessor.tokenize('foo bar baz');
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it('should return single token for text "\'foo\'"', function () {
      const tokens = textProcessor.tokenize("'foo'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it("should return two tokens for text \"'foo' 'bar'\"", function () {
      const tokens = textProcessor.tokenize("'foo' 'bar'");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it("should return three tokens for text \"'foo' 'bar' 'baz'\"", function () {
      const tokens = textProcessor.tokenize("'foo' 'bar' 'baz'");
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it("should return single token for text \"'f''o''o'\"", function () {
      const tokens = textProcessor.tokenize("'f''o''o'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it("should return two tokens for text \"'f'o'o' b'ar'\"", function () {
      const tokens = textProcessor.tokenize("'f'o'o' b'ar'");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it("should return three tokens for text \"'fo'o b'a'r 'ba'z\"", function () {
      const tokens = textProcessor.tokenize("'fo'o b'a'r 'ba'z");
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it("should return single token for text \"''foo''\"", function () {
      const tokens = textProcessor.tokenize("''foo''");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it("should return two tokens for text \"'''foo''' ''''bar''''\"", function () {
      const tokens = textProcessor.tokenize("'''foo''' ''''bar''''");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it('should return single token for text "f\'oo bar"', function () {
      const tokens = textProcessor.tokenize("f'oo bar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it('should return single token for text "\'foo bar"', function () {
      const tokens = textProcessor.tokenize("'foo bar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it('should return two tokens for text "foo \'bar"', function () {
      const tokens = textProcessor.tokenize("foo 'bar");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it('should return two tokens for text "foo b\'ar"', function () {
      const tokens = textProcessor.tokenize("foo b'ar");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it("should return three tokens for text \"foo'' bar'' ''baz''\"", function () {
      const tokens = textProcessor.tokenize("foo'' bar'' ''baz''");
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it('should return single token for text "foo\' \'bar"', function () {
      const tokens = textProcessor.tokenize("foo' 'bar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it("should return single token for text \"foo''' '''bar\"", function () {
      const tokens = textProcessor.tokenize("foo''' bar'''");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it('should return single token for text "fo\'o b\'ar"', function () {
      const tokens = textProcessor.tokenize("fo'o b'ar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it("should return single token for text \"f'''oo ba'''r\"", function () {
      const tokens = textProcessor.tokenize("f'''oo ba'''r");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it("should correctly escape quotation character in text \"'foo b\\'ar'\"", function () {
      const tokens = textProcessor.tokenize("'foo b\\'ar'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], "foo b'ar");
    });

    it('should correctly escape "escape" character in text "f\'oo b\\\\\'ar"', function () {
      const tokens = textProcessor.tokenize("f'oo b\\\\'ar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo b\\ar');
    });

    it('should correctly escape both "\\" and "\'" characters in text "\'\\\\foo b\\\\\\\'ar\'"', function () {
      const tokens = textProcessor.tokenize("'\\\\foo b\\\\\\'ar'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], "\\foo b\\'ar");
    });

    it('should correctly escape both "\\" and "\'" characters in text "\'fo\\\'o\\\\ \\\\\\\'bar\'"', function () {
      const tokens = textProcessor.tokenize("'fo\\'o\\\\ \\\\\\'bar'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], "fo'o\\ \\'bar");
    });
  });

  describe('#detokenize()', function () {
    it('should return "foo" for tokens [foo]', function () {
      const text = textProcessor.detokenize(['foo']);
      assert.strictEqual(text, 'foo');
    });

    it('should return "foo bar" for tokens [foo, bar]', function () {
      const text = textProcessor.detokenize(['foo', 'bar']);
      assert.strictEqual(text, 'foo bar');
    });

    it('should return "\'foo bar\'" for tokens [foo bar]', function () {
      const text = textProcessor.detokenize(['foo bar']);
      assert.strictEqual(text, "'foo bar'");
    });

    it("should return \"'\\'foo\\''\" for tokens ['foo']", function () {
      const text = textProcessor.detokenize(["'foo'"]);
      assert.strictEqual(text, "'\\'foo\\''");
    });

    it("should return \"'\\'foo\\'' '\\'bar\\''\" for tokens ['foo', 'bar']", function () {
      const text = textProcessor.detokenize(["'foo'", "'bar'"]);
      assert.strictEqual(text, "'\\'foo\\'' '\\'bar\\''");
    });

    it("should return \"'\\'fo\\\\o\\''\" for tokens ['fo\\o']", function () {
      const text = textProcessor.detokenize(["'fo\\o'"]);
      assert.strictEqual(text, "'\\'fo\\\\o\\''");
    });

    it("should return \"fo\\o 'b\\'ar'\" for tokens [fo\\o, b'ar]", function () {
      const text = textProcessor.detokenize(['fo\\o', "b'ar"]);
      assert.strictEqual(text, "fo\\o 'b\\'ar'");
    });

    it("should return \"' ' ' \\\\ '\" for tokens [ ,   ]", function () {
      const text = textProcessor.detokenize([' ', ' \\ ']);
      assert.strictEqual(text, "' ' ' \\\\ '");
    });
  });
});

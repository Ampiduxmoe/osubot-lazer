/* eslint-disable prefer-arrow-callback */
import assert from 'assert';
import {MainTextProcessor} from '../../../../main/presentation/common/arg_processing/MainTextProcessor';

describe('TextProcessor', function () {
  const textProcessor = new MainTextProcessor(' ', ["'", '"', '`'], '\\');
  describe('#tokenize()', function () {
    it('should return single token for text "foo"', function () {
      // Simplest of tokens, should stay as is
      const tokens = textProcessor.tokenize('foo');
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it('should return two tokens for text "foo bar"', function () {
      // Two simple words should be treated as two tokens, as is
      const tokens = textProcessor.tokenize('foo bar');
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it('should return three tokens for text "foo bar baz"', function () {
      // Three words should be three tokens without changes
      const tokens = textProcessor.tokenize('foo bar baz');
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it('should return single token for text "\'foo\'"', function () {
      // Quotation should not affect text contents
      // if it doesn't contain special characters
      // (escape character and same quotation character)
      const tokens = textProcessor.tokenize("'foo'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it("should return two tokens for text \"'foo' 'bar'\"", function () {
      // Quotation should not affect text contents, but with two words
      const tokens = textProcessor.tokenize("'foo' 'bar'");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it("should return three tokens for text \"'foo' 'bar' 'baz'\"", function () {
      // Quotation should not affect text contents, but with three words
      const tokens = textProcessor.tokenize("'foo' 'bar' 'baz'");
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it("should return single token for text \"'f''o''o'\"", function () {
      // Quotation contents should be concatenated
      // if not separated by separator character
      const tokens = textProcessor.tokenize("'f''o''o'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it("should return two tokens for text \"'f'o'o' b'ar'\"", function () {
      // Confirm concatenation works for two words
      // with different quotation arrangement
      const tokens = textProcessor.tokenize("'f'o'o' b'ar'");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it("should return three tokens for text \"'fo'o b'a'r 'ba'z\"", function () {
      // Confirm position of quotation start/end doesn't affect results
      const tokens = textProcessor.tokenize("'fo'o b'a'r 'ba'z");
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it("should return single token for text \"''foo''\"", function () {
      // Zero-length quotes should not affect text at all
      const tokens = textProcessor.tokenize("''foo''");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo');
    });

    it("should return two tokens for text \"'''foo''' ''''bar''''\"", function () {
      // Confirm extreme quotation sequences are handled correctly
      const tokens = textProcessor.tokenize("'''foo''' ''''bar''''");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it('should return single token for text "f\'oo bar"', function () {
      // Quotation that was not properly closed
      // should be considered ending when string ends
      const tokens = textProcessor.tokenize("f'oo bar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it('should return single token for text "\'foo bar"', function () {
      // Confirm position of non-closed quotation doesn't matter
      const tokens = textProcessor.tokenize("'foo bar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it('should return two tokens for text "foo \'bar"', function () {
      // Confirm position of non-closed quotation doesn't matter
      const tokens = textProcessor.tokenize("foo 'bar");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it('should return two tokens for text "foo b\'ar"', function () {
      // Confirm position of non-closed quotation doesn't matter
      const tokens = textProcessor.tokenize("foo b'ar");
      assert.strictEqual(tokens.length, 2);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
    });

    it("should return three tokens for text \"foo'' bar'' ''baz''\"", function () {
      // Confirm many weird zero-length quotations are handled correctly
      const tokens = textProcessor.tokenize("foo'' bar'' ''baz''");
      assert.strictEqual(tokens.length, 3);
      assert.strictEqual(tokens[0], 'foo');
      assert.strictEqual(tokens[1], 'bar');
      assert.strictEqual(tokens[2], 'baz');
    });

    it('should return single token for text "foo\' \'bar"', function () {
      // Confirm concatenation by single whitespace quote works
      const tokens = textProcessor.tokenize("foo' 'bar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it("should return single token for text \"foo''' '''bar\"", function () {
      // Confirm concatenation by single whitespace quote works
      // in extreme quotation sequences
      const tokens = textProcessor.tokenize("foo''' bar'''");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it('should return single token for text "fo\'o b\'ar"', function () {
      // Confirm concatenation by single quote works with other characters
      const tokens = textProcessor.tokenize("fo'o b'ar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it("should return single token for text \"f'''oo ba'''r\"", function () {
      // Confirm concatenation by single quote works with other characters
      // when used with extreme quotation sequences
      const tokens = textProcessor.tokenize("f'''oo ba'''r");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo bar');
    });

    it("should correctly escape quotation character in text \"'foo b\\'ar'\"", function () {
      // Backslash here should be treated as escaping character
      // and not be a part of the final token
      const tokens = textProcessor.tokenize("'foo b\\'ar'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], "foo b'ar");
    });

    it('should not escape "escape" character in text "f\'oo b\\a\'r"', function () {
      // This escape character precedes normal character that doesn't need escaping
      // so it is not actually an escape character in this instance
      const tokens = textProcessor.tokenize("f'oo b\\a'r");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo b\\ar');
    });

    it('should correctly escape "escape" character in text "f\'oo b\\\\\'ar"', function () {
      // First escape character precedes character that should be escaped
      // so it should be treated as an actual escape character
      const tokens = textProcessor.tokenize("f'oo b\\\\'ar");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], 'foo b\\ar');
    });

    it('should correctly escape both "\\" and "\'" characters in text "\'\\\\foo b\\\\\\\'ar\'"', function () {
      // Confirm it works correctly in extreme cases of escape sequences
      const tokens = textProcessor.tokenize("'\\\\foo b\\\\\\'ar'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], "\\foo b\\'ar");
    });

    it('should correctly escape both "\\" and "\'" characters in text "\'fo\\\'o\\\\ \\\\\\\'bar\'"', function () {
      // Confirm it works correctly in extreme cases of escape sequences
      // but with different arrangement of whitespaces
      const tokens = textProcessor.tokenize("'fo\\'o\\\\ \\\\\\'bar'");
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], "fo'o\\ \\'bar");
    });

    it('should allow non-escaped quotation character inside quotation that started with another character', function () {
      // We should be able to put non-escaped quotation character
      // inside a quotation that started with another character
      for (const outerQ of textProcessor.quoteChars) {
        for (const innerQ of textProcessor.quoteChars) {
          if (innerQ === outerQ) {
            continue;
          }
          const tokens = textProcessor.tokenize(
            `foo ${outerQ}one ${innerQ}two${innerQ} three${outerQ} bar`
          );
          assert.strictEqual(tokens.length, 3);
          assert.strictEqual(tokens[0], 'foo');
          assert.strictEqual(tokens[1], `one ${innerQ}two${innerQ} three`);
          assert.strictEqual(tokens[2], 'bar');
        }
      }
    });
  });

  describe('#detokenize()', function () {
    it('should return "foo" for tokens [foo]', function () {
      // Most simple token, should stay as is
      const text = textProcessor.detokenize(['foo']);
      assert.strictEqual(text, 'foo');
    });

    it('should return "foo bar" for tokens [foo, bar]', function () {
      // Two simple tokens should stay as is
      const text = textProcessor.detokenize(['foo', 'bar']);
      assert.strictEqual(text, 'foo bar');
    });

    it('should return "\'foo bar\'" for tokens [foo bar]', function () {
      // This single token should be quoted using first available quote character
      // since it has special character in it (whitespace that is used as separator)
      const text = textProcessor.detokenize(['foo bar']);
      assert.strictEqual(text, "'foo bar'");
    });

    it("should return \"\"''foo'\"\" for tokens ['foo']", function () {
      // Token should be quoted using first available quote character
      // since it has special character in it (quotation)
      const text = textProcessor.detokenize(["'foo'"]);
      assert.strictEqual(text, '"\'foo\'"');
    });

    it("should return \"\"'foo'\" \"'bar'\"\" for tokens ['foo', 'bar']", function () {
      // Both tokens should be quoted using first available quote character
      const text = textProcessor.detokenize(["'foo'", "'bar'"]);
      assert.strictEqual(text, '"\'foo\'" "\'bar\'"');
    });

    it('should return ""\'fo\\o\'"" for tokens [\'fo\\o\']', function () {
      // If backslash precedes normal character,
      // it should be considered normal character too
      const text = textProcessor.detokenize(["'fo\\o'"]);
      assert.strictEqual(text, '"\'fo\\o\'"');
    });

    it('should return ""\'fo\\\\\\o\'"" for tokens [\'fo\\\\o\']', function () {
      // If backslash precedes a character that can be escaped,
      // it should be considered escaping
      const text = textProcessor.detokenize(["'fo\\\\o'"]);
      assert.strictEqual(text, '"\'fo\\\\\\o\'"');
    });

    it('should return "fo\\o "b\'ar"" for tokens [fo\\o, b\'ar]', function () {
      // First token should remain as is, without quotes,
      // second token should be quoted with first available quote character
      const text = textProcessor.detokenize(['fo\\o', "b'ar"]);
      assert.strictEqual(text, 'fo\\o "b\'ar"');
    });

    it("should return \"' ' ' \\ '\" for tokens [ , \\  ]", function () {
      // Confirm it works well with extreme whitespace sequences
      const text = textProcessor.detokenize([' ', ' \\ ']);
      assert.strictEqual(text, "' ' ' \\ '");
    });
  });
});

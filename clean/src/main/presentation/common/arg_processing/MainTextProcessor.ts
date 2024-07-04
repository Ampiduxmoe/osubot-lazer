import {TextProcessor} from './TextProcessor';

export class MainTextProcessor implements TextProcessor {
  separatorChar: string;
  quoteChar: string;
  escapeChar: string;

  constructor(separatorChar: string, quoteChar: string, escapeChar: string) {
    this.separatorChar = separatorChar;
    this.quoteChar = quoteChar;
    this.escapeChar = escapeChar;
  }

  tokenize(text: string): string[] {
    const {separatorChar, quoteChar, escapeChar} = this;
    const tokenParts: string[][] = [];
    let currentTokenIndex = 0;
    let currentTokenPartStart: number | undefined = undefined;
    let isInsideQuotes = false;
    let isCurrentCharacterEscaped = false;
    const saveTokenPart = (part: string) => {
      const currentTokenParts = tokenParts[currentTokenIndex];
      if (currentTokenParts === undefined) {
        tokenParts.push([part]);
      } else {
        currentTokenParts.push(part);
      }
    };
    for (const [i, c] of text.split('').entries()) {
      if (c === escapeChar && isInsideQuotes) {
        // we encountered escape character inside quotes
        // where it can be used to escape next character
        // it has no effect outside quotes
        if (!isCurrentCharacterEscaped) {
          // this escape character was not escaped
          // it means it is escapes next character
          // and is not a part of an actual text
          isCurrentCharacterEscaped = true;
          // so we try to save current token part and skip this character
          if (currentTokenPartStart === undefined) {
            // we encountered escape character right after quote char: '\
            continue;
          }
          saveTokenPart(text.substring(currentTokenPartStart, i));
          currentTokenPartStart = undefined;
          continue;
        }
        // this escape character was escaped
        // we treat it as any other character and fall through:
      }
      if (
        (c !== separatorChar || isInsideQuotes) &&
        (c !== quoteChar || isCurrentCharacterEscaped)
      ) {
        // we encountered regular character
        if (currentTokenPartStart === undefined) {
          currentTokenPartStart = i; // mark it as token start if needed
        }
        isCurrentCharacterEscaped = false; // tell next char it is not escaped
        continue; // and go to next character
      }
      if (c === quoteChar) {
        // we encountered quote character that actually opens or closes the quotation
        isInsideQuotes = !isInsideQuotes;
        if (currentTokenPartStart === undefined) {
          // we encountered multiple quotes back to back
          // or a quote after a separator
          continue;
        }
        saveTokenPart(text.substring(currentTokenPartStart, i));
        currentTokenPartStart = undefined;
        continue;
      }
      if (c === separatorChar) {
        // we encountered separator character that actually separates tokens
        // we should try to save current token part and move to the next token
        if (currentTokenPartStart === undefined) {
          // we either encountered this separator in the beginning of the text
          // or it is one of multiple separators written back to back
          currentTokenIndex += 1;
          continue;
        }
        saveTokenPart(text.substring(currentTokenPartStart, i));
        currentTokenPartStart = undefined;
        currentTokenIndex += 1;
        continue;
      }
    }
    if (currentTokenPartStart !== undefined) {
      // text ended normally, on a non-separator character
      // so we save last token part
      saveTokenPart(text.substring(currentTokenPartStart, text.length));
    }
    return tokenParts.map(parts => parts.join(''));
  }

  detokenize(tokens: string[]): string {
    return tokens
      .map(t =>
        !(
          t.includes(this.quoteChar) ||
          t.includes(this.escapeChar) ||
          t.includes(this.separatorChar)
        )
          ? t
          : this.quoteChar +
            t
              .split('')
              .map(c =>
                c === this.quoteChar || c === this.escapeChar
                  ? this.escapeChar + c
                  : c
              )
              .join('') +
            this.quoteChar
      )
      .join(this.separatorChar);
  }
}

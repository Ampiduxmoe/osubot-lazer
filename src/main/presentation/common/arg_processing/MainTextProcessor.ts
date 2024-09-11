import {TextProcessor} from './TextProcessor';

export class MainTextProcessor implements TextProcessor {
  constructor(
    public separatorChar: string,
    public quoteChars: string[],
    public escapeChar: string
  ) {}

  tokenize(text: string): string[] {
    const {separatorChar, quoteChars, escapeChar} = this;
    const tokenParts: string[][] = [];
    let currentTokenIndex = 0;
    let currentTokenPartStart: number | undefined = undefined;
    let currentQuotationChar: string | undefined = undefined;
    let isCurrentCharacterEscaped = false;
    const isInsideQuotes = (): boolean => currentQuotationChar !== undefined;
    const saveTokenPart = (part: string): void => {
      const currentTokenParts = tokenParts[currentTokenIndex];
      if (currentTokenParts === undefined) {
        tokenParts.push([part]);
      } else {
        currentTokenParts.push(part);
      }
    };
    const isEscapable = (char: string): boolean => {
      if (currentQuotationChar !== undefined) {
        return ['\\', currentQuotationChar].includes(char);
      }
      return ['\\'].includes(char);
    };
    for (const [i, c] of text.split('').entries()) {
      if (c === escapeChar && isInsideQuotes()) {
        // We encountered escape character inside quotes
        // where it can be used to escape next character.
        // It has no special effect outside of quotes
        const nextChar = text[i + 1];
        if (!isCurrentCharacterEscaped && isEscapable(nextChar)) {
          // This escape character was not escaped.
          // It means it escapes next character
          // and is not a part of an actual text,
          isCurrentCharacterEscaped = true;
          // so we try to save current token part and skip this character.
          if (currentTokenPartStart === undefined) {
            // We encountered escape character right after quote char
            // so there is nothing to save.
            continue;
          }
          saveTokenPart(text.substring(currentTokenPartStart, i));
          currentTokenPartStart = undefined;
          continue;
        }
        // This escape character was escaped.
        // We treat it as any other character and fall through.
      }
      const isRelatedToQuotation =
        currentQuotationChar === undefined
          ? quoteChars.includes(c)
          : c === currentQuotationChar;
      if (
        (c !== separatorChar || isInsideQuotes()) &&
        (!isRelatedToQuotation || isCurrentCharacterEscaped)
      ) {
        // We encountered regular character.
        // Mark it as token start if needed,
        currentTokenPartStart ??= i;
        // tell next character it is not escaped
        isCurrentCharacterEscaped = false;
        // and go to next character
        continue;
      }
      if (quoteChars.includes(c)) {
        // We encountered quote character
        // that actually opens or closes the quotation.
        if (isInsideQuotes()) {
          currentQuotationChar = undefined;
        } else {
          currentQuotationChar = c;
        }
        if (currentTokenPartStart === undefined) {
          // We encountered multiple quotes back to back
          // or a quote after a separator
          // so there is nothing to save.
          continue;
        }
        saveTokenPart(text.substring(currentTokenPartStart, i));
        currentTokenPartStart = undefined;
        continue;
      }
      if (c === separatorChar) {
        // We encountered separator character that actually separates tokens.
        // We should try to save current token part and move to the next token.
        if (currentTokenPartStart === undefined) {
          // We either encountered this separator in the beginning of the text
          // or it is one of multiple separators written back to back.
          // In any case there is nothing to save.
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
      // Text ended normally, on a non-separator character.
      // We save remaining token part.
      saveTokenPart(text.substring(currentTokenPartStart, text.length));
    }
    // Assemble token parts into tokens.
    return tokenParts.map(parts => parts.join(''));
  }

  detokenize(tokens: string[]): string {
    const includesQuoteChar = (s: string): boolean => {
      for (const c of this.quoteChars) {
        if (s.includes(c)) {
          return true;
        }
      }
      return false;
    };
    const findUnusedQuotationChars = (s: string): string[] => {
      const unusedQuoteChars: string[] = [];
      for (const c of this.quoteChars) {
        if (!s.includes(c)) {
          unusedQuoteChars.push(c);
        }
      }
      return unusedQuoteChars;
    };
    const transformString = (
      t: string,
      fn: (c: string, i: number) => string
    ): string => {
      return t
        .split('')
        .map((c, i) => fn(c, i))
        .join('');
    };
    return tokens
      .map(t =>
        !(includesQuoteChar(t) || t.includes(this.separatorChar))
          ? t
          : (() => {
              const selectedQuotationChar =
                findUnusedQuotationChars(t)[0] ?? this.quoteChars[0];
              const isEscapable = (char: string): boolean => {
                return [this.escapeChar, selectedQuotationChar].includes(char);
              };
              const escapedToken = transformString(t, (c, i) =>
                c === selectedQuotationChar ||
                (c === this.escapeChar && isEscapable(t[i + 1]))
                  ? this.escapeChar + c
                  : c
              );
              return (
                selectedQuotationChar + escapedToken + selectedQuotationChar
              );
            })()
      )
      .join(this.separatorChar);
  }
}

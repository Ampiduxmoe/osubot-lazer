export const VK_REPLY_PROCESSING = {
  mentionIdOverride: 'id1',
  sanitize: function (text: string): string {
    const mentionRegex = /\[(?:club|id)\d+\|(.+?)\]/gi;
    const massPingWords: string[] = [
      ...['everyone', 'all', 'все'],
      ...['online', 'here', 'тут', 'здесь'],
    ];
    const massPingPrefixes = ['@', '\\*'];
    const massPingRegex = new RegExp(
      `(${massPingPrefixes.join('|')})(${massPingWords.join('|')})`,
      'gi'
    );
    return text
      .replace(mentionRegex, `[${this.mentionIdOverride}|$1]`)
      .replace(massPingRegex, `[${this.mentionIdOverride}|$1guys]`);
  },
};

export function chooseCorrectWordFormFromCount(
  n: number,
  one: string,
  two: string,
  five: string
) {
  n = Math.abs(n);
  if (Number.isInteger(n)) {
    const wordForms = [one, two, five];
    const options = [2, 0, 1, 1, 1, 2];
    return wordForms[
      n % 100 > 4 && n % 100 < 20 ? 2 : options[n % 10 < 5 ? n % 10 : 5]
    ];
  }
  return two;
}

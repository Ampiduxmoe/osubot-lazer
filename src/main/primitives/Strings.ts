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

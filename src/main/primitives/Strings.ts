export const VK_REPLY_PROCESSING = {
  mentionIdOverride: 'id1',
  sanitize: function (text: string): string {
    const mentionRegex = /\[(?:club|id)\d+\|(.+?)\]/g;
    return text.replace(mentionRegex, `[${this.mentionIdOverride}|$1]`);
  },
};

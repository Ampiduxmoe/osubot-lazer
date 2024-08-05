/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {OsuUserInfo} from '../../../application/usecases/get_osu_user_info/GetOsuUserInfoResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {
  ChatLeaderboard,
  ChatLeaderboardExecutionArgs,
} from '../../commands/ChatLeaderboard';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ChatLeaderboardVk extends ChatLeaderboard<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ChatLeaderboardExecutionArgs> {
    const fail = CommandMatchResult.fail<ChatLeaderboardExecutionArgs>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    if (command === undefined) {
      return fail;
    }
    return this.matchText(command);
  }

  createLeaderboardMessage(
    server: OsuServer,
    users: OsuUserInfo[],
    mode: OsuRuleset,
    missingUsernames: string[],
    isChatLb: boolean
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const usersText = users
      .map((u, i) => this.shortUserDescription(i + 1, u))
      .join('\n');
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Топ ${isChatLb ? 'игроков чата' : 'выбранных игроков'}

${usersText}

${missingUsernamesMessage}
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  shortUserDescription(pos: number, user: OsuUserInfo): string {
    const rankGlobal = user.rankGlobal || '—';
    const acc = user.accuracy.toFixed(2);
    const pp = isNaN(user.pp) ? '—' : user.pp.toFixed(0);
    return `
${pos}. ${user.username}
　 ${acc}%　${pp}pp　#${rankGlobal}
    `.trim();
  }

  createNoUsersMessage(
    server: OsuServer,
    missingUsernames: string[]
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const text = `
[Server: ${serverString}]
Невозможно выполнить команду для пустого списка игроков!
Привяжите ник к аккаунту или укажите список ников для отображения

${missingUsernamesMessage}
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }
}

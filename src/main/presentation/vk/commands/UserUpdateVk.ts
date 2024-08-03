/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {OsuUserUpdateInfo} from '../../../application/usecases/get_osu_user_update/GetOsuUserUpdateResponse';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {UserUpdate, UserUpdateExecutionArgs} from '../../commands/UserUpdate';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class UserUpdateVk extends UserUpdate<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserUpdateExecutionArgs> {
    const fail = CommandMatchResult.fail<UserUpdateExecutionArgs>();
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

  async createUserUpdateMessage(
    server: OsuServer,
    mode: OsuRuleset,
    userUpdate: OsuUserUpdateInfo
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const {
      username,
      rankChange,
      ppChange,
      accuracyChange,
      playcountChange,
      newHighscores,
    } = userUpdate;
    const rankChangeStr = rankChange < 0 ? `-${rankChange}` : `+${rankChange}`;
    const ppChangeStr =
      ppChange < 0 ? `-${ppChange.toFixed(2)}` : `+${ppChange.toFixed(2)}`;
    const accuracyChangeStr =
      accuracyChange < 0
        ? `-${ppChange.toFixed(2)}`
        : `+${ppChange.toFixed(2)}`;
    const highscoresText =
      newHighscores.length === 0
        ? ''
        : `\n\nНовых топ-скоров: ${newHighscores.length}\n` +
          newHighscores
            .slice(0, 10)
            .map(
              s =>
                `#${s.absolutePosition}: ${s.pp.toFixed(2)}pp https://osu.ppy.sh/b/${s.beatmapId}`
            )
            .join('\n');
    const maybeMoreScoresText = newHighscores.length <= 10 ? '' : '\n...';
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Изменения у ${username}:
PP: ${ppChangeStr}　Rank: ${rankChangeStr}
Accuracy: ${accuracyChangeStr}%
Playcount: +${playcountChange}
https://ameobea.me/osutrack/user/${username}${highscoresText}${maybeMoreScoresText}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createUnsupportedServerMessage(): Promise<VkOutputMessage> {
    return {
      text: 'Команда недоступна для этого сервера',
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createUserNotFoundMessage(
    server: OsuServer,
    username: string
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Пользователь с ником ${username} не найден
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createUsernameNotBoundMessage(
    server: OsuServer
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не установлен ник!
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}

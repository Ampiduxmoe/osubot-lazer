import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {
  SetUsername,
  SetUsernameExecutionArgs,
} from '../../commands/SetUsername';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class SetUsernameVk extends SetUsername<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<SetUsernameExecutionArgs> {
    const fail = CommandMatchResult.fail<SetUsernameExecutionArgs>();
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

  createNoArgsMessage(
    server: OsuServer,
    currentUsername: string | undefined,
    unlinkUsername: () => Promise<boolean>
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const currentUsernameText =
      currentUsername === undefined
        ? 'В данный момент ник не привязан\n\nЧтобы установить ник, повторите эту команду с указанием ника'
        : `Текущий ник: ${currentUsername}`;
    const text = `
  [Server: ${serverString}]
  ${currentUsernameText}
    `.trim();
    if (currentUsername === undefined) {
      return MaybeDeferred.fromValue({
        text: text,
        attachment: undefined,
        buttons: undefined,
      });
    }
    return MaybeDeferred.fromValue({
      text: undefined,
      attachment: undefined,
      buttons: undefined,
      navigation: {
        currentContent: {
          text: text,
          attachment: undefined,
          buttons: undefined,
        },
        navigationButtons: [
          [
            {
              text: 'Отвязать ник',
              generateMessage: () => {
                return MaybeDeferred.fromInstantPromise(
                  (async () => {
                    const success = await unlinkUsername();
                    const successText = success
                      ? 'Ник успешно отвязан'
                      : 'Не удалось отвязать ник: произошла ошибка во время выполнения команды';
                    return {
                      text: undefined,
                      attachment: undefined,
                      buttons: undefined,
                      navigation: {
                        currentContent: {
                          text: successText,
                          attachment: undefined,
                          buttons: undefined,
                        },
                      },
                    };
                  })()
                );
              },
            },
          ],
        ],
      },
    });
  }

  createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Пользователь с ником ${usernameInput} не найден
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createUsernameSetMessage(
    server: OsuServer,
    username: string,
    mode: OsuRuleset
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}]
Установлен ник ${username} (режим: ${modeString})
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }
}

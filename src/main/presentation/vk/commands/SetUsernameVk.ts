import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {LinkUsernameResult} from '../../commands/common/LinkUsernameResult';
import {
  SetUsername,
  SetUsernameExecutionArgs,
} from '../../commands/SetUsername';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';
import {DynamicLinkUsernamePageGeneratorVk} from './common/DynamicLinkUsernamePageGenerator';

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
    setUsername: (username: string) => Promise<LinkUsernameResult | undefined>,
    unlinkUsername: () => Promise<boolean>
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const currentUsernameText =
      currentUsername === undefined
        ? 'В данный момент ник не привязан'
        : `Текущий ник: ${currentUsername}`;
    const text = `
  [Server: ${serverString}]
  ${currentUsernameText}
    `.trim();
    const generateLinkUsernamePage = () =>
      DynamicLinkUsernamePageGeneratorVk.createOutputMessage({
        server: server,
        getCancelPage: () =>
          this.createNoArgsMessage(
            server,
            currentUsername,
            setUsername,
            unlinkUsername
          ),
        linkUsername: newUsername =>
          setUsername(newUsername).then(result => {
            currentUsername = result?.username;
            return result;
          }),
        successPageButton: undefined,
      });
    if (currentUsername === undefined) {
      return MaybeDeferred.fromValue({
        navigation: {
          currentContent: {
            text: text,
          },
          navigationButtons: [
            [
              {
                text: 'Привязать ник',
                generateMessage: generateLinkUsernamePage,
              },
            ],
          ],
        },
      });
    }
    return MaybeDeferred.fromValue({
      navigation: {
        currentContent: {
          text: text,
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
                      ? `[Server: ${serverString}]\nНик успешно отвязан`
                      : `[Server: ${serverString}]\nНе удалось отвязать ник: произошла ошибка во время выполнения команды`;
                    if (success) {
                      currentUsername = undefined;
                    }
                    return {
                      navigation: {
                        currentContent: {
                          text: successText,
                        },
                        navigationButtons: !success
                          ? undefined
                          : [
                              [
                                {
                                  text: 'Привязать ник',
                                  generateMessage: generateLinkUsernamePage,
                                },
                              ],
                            ],
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
    });
  }
}

import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {VK_REPLY_PROCESSING} from '../../../primitives/Strings';
import {
  SetUsername,
  SetUsernameExecutionArgs,
  SetUsernameViewParams,
} from '../../commands/SetUsername';
import {USERNAME} from '../../common/arg_processing/CommandArguments';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkNavigationCaption, VkOutputMessage} from '../VkOutputMessage';

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
    retryWithUsername: (username: string) => Promise<SetUsernameViewParams>,
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
                generateMessage: () => {
                  return MaybeDeferred.fromValue({
                    navigation: {
                      currentContent: {
                        text: 'Введите ник',
                      },
                      messageListener: {
                        test: (replyText, senderInfo) => {
                          if (!senderInfo.isDialogInitiator) {
                            return undefined;
                          }
                          if (!USERNAME.match(replyText)) {
                            return 'edit';
                          }
                          return 'match';
                        },
                        getEdit: replyText =>
                          VK_REPLY_PROCESSING.sanitize(
                            `«${replyText}» содержит недопустимые символы`
                          ),
                        generateMessage: (_, replyText) =>
                          MaybeDeferred.fromFastPromise(
                            (async () => {
                              const viewParams =
                                await retryWithUsername(replyText);
                              return await this.createOutputMessage(viewParams)
                                .resultValue;
                            })()
                          ),
                      },
                      navigationButtons: [
                        [
                          {
                            text: 'Назад',
                            generateMessage: () =>
                              this.createNoArgsMessage(
                                server,
                                currentUsername,
                                retryWithUsername,
                                unlinkUsername
                              ),
                          },
                        ],
                      ],
                      enabledCaptions: [
                        VkNavigationCaption.NAVIGATION_LISTENING,
                        VkNavigationCaption.NAVIGATION_EXPIRE,
                      ],
                    },
                  });
                },
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
                    return {
                      navigation: {
                        currentContent: {
                          text: successText,
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

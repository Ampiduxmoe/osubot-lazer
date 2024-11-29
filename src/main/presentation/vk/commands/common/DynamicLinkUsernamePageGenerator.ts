import {MaybeDeferred} from '../../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';
import {VK_REPLY_PROCESSING} from '../../../../primitives/Strings';
import {LinkUsernameResult} from '../../../commands/common/LinkUsernameResult';
import {USERNAME} from '../../../common/arg_processing/CommandArguments';
import {VkNavigationCaption, VkOutputMessage} from '../../VkOutputMessage';

export class DynamicLinkUsernamePageGeneratorVk {
  static createOutputMessage({
    server,
    getCancelPage,
    linkUsername,
    successPageButton,
  }: {
    server: OsuServer;
    getCancelPage: () => MaybeDeferred<VkOutputMessage>;
    linkUsername: (username: string) => Promise<LinkUsernameResult | undefined>;
    successPageButton?: {
      text: string;
      generateMessage: () => MaybeDeferred<VkOutputMessage>;
    };
  }): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
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
              linkUsername(replyText).then(result =>
                result === undefined
                  ? {
                      navigation: {
                        currentContent: {
                          text: `[Server: ${serverString}]\nПользователь с ником ${replyText} не найден`,
                        },
                        navigationButtons: [
                          [
                            {
                              text: 'Ввести другой ник',
                              generateMessage: () =>
                                this.createOutputMessage({
                                  server,
                                  getCancelPage: getCancelPage,
                                  linkUsername: linkUsername,
                                  successPageButton: successPageButton,
                                }),
                            },
                          ],
                        ],
                      },
                    }
                  : {
                      navigation: {
                        currentContent: {
                          text: `[Server: ${serverString}]\nУстановлен ник ${result.username} (режим: ${OsuRuleset[result.mode]})`,
                        },
                        navigationButtons:
                          successPageButton === undefined
                            ? undefined
                            : [[successPageButton]],
                      },
                    }
              )
            ),
        },
        navigationButtons: [
          [
            {
              text: 'Отмена',
              generateMessage: getCancelPage,
            },
          ],
        ],
        enabledCaptions: [
          VkNavigationCaption.NAVIGATION_LISTENING,
          VkNavigationCaption.NAVIGATION_EXPIRE,
        ],
      },
    });
  }
}

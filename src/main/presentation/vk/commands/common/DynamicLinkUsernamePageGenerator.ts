import {MaybeDeferred} from '../../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {OsuServer} from '../../../../primitives/OsuServer';
import {VK_REPLY_PROCESSING} from '../../../../primitives/Strings';
import {LinkUsernameResult} from '../../../commands/common/LinkUsernameResult';
import {USERNAME} from '../../../common/arg_processing/CommandArguments';
import {VkNavigationCaption, VkOutputMessage} from '../../VkOutputMessage';

export class DynamicLinkUsernamePageGeneratorVk {
  constructor(
    private server: OsuServer,
    private getCancelPage: () => MaybeDeferred<VkOutputMessage>,
    private linkUsername: (
      username: string
    ) => Promise<LinkUsernameResult | undefined>,
    private successPageButton?: {
      text: string;
      generateMessage: () => MaybeDeferred<VkOutputMessage>;
    }
  ) {}

  static create(args: {
    server: OsuServer;
    getCancelPage: () => MaybeDeferred<VkOutputMessage>;
    linkUsername: (username: string) => Promise<LinkUsernameResult | undefined>;
    successPageButton?: {
      text: string;
      generateMessage: () => MaybeDeferred<VkOutputMessage>;
    };
  }) {
    return new DynamicLinkUsernamePageGeneratorVk(
      args.server,
      args.getCancelPage,
      args.linkUsername,
      args.successPageButton
    );
  }

  generate = this.generateLinkUsernamePage;

  generateLinkUsernamePage(): MaybeDeferred<VkOutputMessage> {
    const {
      server,
      getCancelPage,
      linkUsername,
      successPageButton,
      generateLinkUsernamePage,
    } = this;
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
              (async () => {
                const result = await linkUsername(replyText);
                if (result === undefined) {
                  return {
                    navigation: {
                      currentContent: {
                        text: `[Server: ${serverString}]\nПользователь с ником ${replyText} не найден`,
                      },
                      navigationButtons: [
                        [
                          {
                            text: 'Ввести другой ник',
                            generateMessage:
                              generateLinkUsernamePage.bind(this),
                          },
                        ],
                      ],
                    },
                  };
                }
                return {
                  navigation: {
                    currentContent: {
                      text: `[Server: ${serverString}]\nУстановлен ник ${result.username} (режим: ${OsuRuleset[result.mode]})`,
                    },
                    navigationButtons:
                      successPageButton === undefined
                        ? undefined
                        : [[successPageButton]],
                  },
                };
              })()
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

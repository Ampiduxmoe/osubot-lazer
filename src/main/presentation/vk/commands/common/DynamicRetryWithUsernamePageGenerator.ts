import {MaybeDeferred} from '../../../../primitives/MaybeDeferred';
import {OsuServer} from '../../../../primitives/OsuServer';
import {VK_REPLY_PROCESSING} from '../../../../primitives/Strings';
import {USERNAME} from '../../../common/arg_processing/CommandArguments';
import {VkNavigationCaption, VkOutputMessage} from '../../VkOutputMessage';

export class DynamicRetryWithUsernamePageGenerator<TViewParams> {
  constructor(
    private server: OsuServer,
    private getCancelPage: () => MaybeDeferred<VkOutputMessage>,
    private retryWithUsername: (
      username?: string
    ) => MaybeDeferred<TViewParams>,
    private isUserFound: (viewParams: TViewParams) => boolean,
    private onSuccess: (
      viewParams: TViewParams
    ) => MaybeDeferred<VkOutputMessage>
  ) {}

  static create<TViewParams>(args: {
    server: OsuServer;
    getCancelPage: () => MaybeDeferred<VkOutputMessage>;
    retryWithUsername: (username?: string) => MaybeDeferred<TViewParams>;
    isUserFound: (viewParams: TViewParams) => boolean;
    onSuccess: (viewParams: TViewParams) => MaybeDeferred<VkOutputMessage>;
  }): DynamicRetryWithUsernamePageGenerator<TViewParams> {
    return new DynamicRetryWithUsernamePageGenerator(
      args.server,
      args.getCancelPage,
      args.retryWithUsername,
      args.isUserFound,
      args.onSuccess
    );
  }

  generate = this.generateRetryWithUsernameDynamicPage;

  generateRetryWithUsernameDynamicPage(): MaybeDeferred<VkOutputMessage> {
    const {
      server,
      getCancelPage,
      retryWithUsername,
      isUserFound,
      onSuccess,
      generateRetryWithUsernameDynamicPage,
    } = this;
    const serverString = OsuServer[server];
    return MaybeDeferred.fromValue<VkOutputMessage>({
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
            retryWithUsername(replyText).extend(result =>
              isUserFound(result)
                ? onSuccess(result).resultValue
                : {
                    navigation: {
                      currentContent: {
                        text: `[Server: ${serverString}]\nПользователь с ником ${replyText} не найден`,
                      },
                      navigationButtons: [
                        [
                          {
                            text: 'Ввести другой ник',
                            generateMessage: () =>
                              generateRetryWithUsernameDynamicPage(),
                          },
                        ],
                      ],
                    },
                  }
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

import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {LinkUsernameResult} from '../../commands/common/LinkUsernameResult';
import {
  OsuUserInfo,
  UserInfo,
  UserInfoExecutionArgs,
  UserInfoViewParams,
} from '../../commands/UserInfo';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage, VkOutputMessageButton} from '../VkOutputMessage';
import {DynamicLinkUsernamePageGeneratorVk} from './common/DynamicLinkUsernamePageGenerator';
import {DynamicRetryWithUsernamePageGenerator} from './common/DynamicRetryWithUsernamePageGenerator';
import {UserBestPlaysVk} from './UserBestPlaysVk';
import {UserRecentPlaysVk} from './UserRecentPlaysVk';

export class UserInfoVk extends UserInfo<VkMessageContext, VkOutputMessage> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserInfoExecutionArgs> {
    const fail = CommandMatchResult.fail<UserInfoExecutionArgs>();
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

  createUserInfoMessage(
    server: OsuServer,
    mode: OsuRuleset,
    userInfo: OsuUserInfo
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const {username} = userInfo;
    const rankGlobal = userInfo.rankGlobal || '—';
    const countryCode = userInfo.countryCode;
    const rankCountry = userInfo.rankCountry || '—';
    const {rankGlobalHighest, rankGlobalHighestDate} = userInfo;
    const {playcount, lvl} = userInfo;
    const {playtimeDays, playtimeHours, playtimeMinutes} = userInfo;
    const pp = userInfo.pp.toFixed(2);
    const accuracy = userInfo.accuracy.toFixed(2);
    const {userId} = userInfo;

    const maybePeakRankString =
      rankGlobalHighest === undefined
        ? ''
        : `\nPeak rank: #${rankGlobalHighest} (${rankGlobalHighestDate})`;

    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Player: ${username}
Rank: #${rankGlobal} (${countryCode} #${rankCountry})${maybePeakRankString}
Playcount: ${playcount} (Lv${lvl})
Playtime: ${playtimeDays}d ${playtimeHours}h ${playtimeMinutes}m
PP: ${pp}
Accuracy: ${accuracy}%

https://osu.ppy.sh/u/${userId}
    `.trim();

    const buttons: VkOutputMessageButton[] = [];
    const userBestPlaysCommand = this.otherCommands.find(
      x => x instanceof UserBestPlaysVk
    );
    if (userBestPlaysCommand !== undefined) {
      buttons.push({
        text: `Топ скоры ${username}`,
        command: userBestPlaysCommand.unparse({
          server: server,
          username: username,
          mode: mode,
        }),
      });
    }
    const userRecentPlaysCommand = this.otherCommands.find(
      x => x instanceof UserRecentPlaysVk
    );
    if (userRecentPlaysCommand !== undefined) {
      buttons.push(
        {
          text: `Последний скор ${username}`,
          command: userRecentPlaysCommand.unparse({
            passesOnly: false,
            server: server,
            username: username,
            mode: mode,
          }),
        },
        {
          text: `Последний пасс ${username}`,
          command: userRecentPlaysCommand.unparse({
            passesOnly: true,
            server: server,
            username: username,
            mode: mode,
          }),
        }
      );
    }
    return MaybeDeferred.fromValue({
      text: text,
      buttons: buttons.map(b => [b]),
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

  createUsernameNotBoundMessage(
    server: OsuServer,
    setUsername:
      | ((username: string) => Promise<LinkUsernameResult | undefined>)
      | undefined,
    retryWithUsername: (username?: string) => MaybeDeferred<UserInfoViewParams>
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
${setUsername === undefined ? 'У этого пользователя не' : 'Не'} установлен ник!
    `.trim();
    const linkUsernamePageGenerator =
      setUsername === undefined
        ? undefined
        : DynamicLinkUsernamePageGeneratorVk.create({
            server: server,
            getCancelPage: () =>
              this.createUsernameNotBoundMessage(
                server,
                setUsername,
                retryWithUsername
              ),
            linkUsername: setUsername,
            successPageButton: {
              text: 'Повторить с новым ником',
              generateMessage: () =>
                retryWithUsername().chain(this.createOutputMessage.bind(this)),
            },
          });
    const retryWithUsernamePageGenerator =
      DynamicRetryWithUsernamePageGenerator.create({
        server: server,
        getCancelPage: () =>
          this.createUsernameNotBoundMessage(
            server,
            setUsername,
            retryWithUsername
          ),
        retryWithUsername: retryWithUsername,
        isUserFound: viewParams => viewParams.userInfo !== undefined,
        onSuccess: viewParams => this.createOutputMessage(viewParams),
      });
    return MaybeDeferred.fromValue({
      navigation: {
        currentContent: {
          text: text,
        },
        navigationButtons: [
          [
            {
              text: 'Ввести ник для команды',
              generateMessage: () => retryWithUsernamePageGenerator.generate(),
            },
          ],
          ...(linkUsernamePageGenerator === undefined
            ? []
            : [
                [
                  {
                    text: 'Привязать ник',
                    generateMessage: () => linkUsernamePageGenerator.generate(),
                  },
                ],
              ]),
        ],
      },
    });
  }
}

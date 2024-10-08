import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {ALL_OSU_SERVER_KEYS, OsuServer} from '../../../primitives/OsuServer';
import {BeatmapInfo} from '../../commands/BeatmapInfo';
import {BotMenu, BotMenuExecutionArgs} from '../../commands/BotMenu';
import {ChatLeaderboard} from '../../commands/ChatLeaderboard';
import {ChatLeaderboardOnMap} from '../../commands/ChatLeaderboardOnMap';
import {Help} from '../../commands/Help';
import {SetUsername} from '../../commands/SetUsername';
import {UserBestPlays} from '../../commands/UserBestPlays';
import {UserBestPlaysOnMap} from '../../commands/UserBestPlaysOnMap';
import {UserInfo} from '../../commands/UserInfo';
import {UserRecentPlays} from '../../commands/UserRecentPlays';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {
  VkOutputMessage,
  VkOutputMessageButton,
  VkOutputMessageContent,
} from '../VkOutputMessage';
import {HelpVk} from './HelpVk';

export class BotMenuVk extends BotMenu<VkMessageContext, VkOutputMessage> {
  constructor(
    public groupId: number,
    ...parentParams: ConstructorParameters<
      typeof BotMenu<VkMessageContext, VkOutputMessage>
    >
  ) {
    super(...parentParams);
  }

  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<BotMenuExecutionArgs> {
    const fail = CommandMatchResult.fail<BotMenuExecutionArgs>();
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

  createBotMenuMessage(): MaybeDeferred<VkOutputMessage> {
    return toOutput(this.mainPage());
  }

  async mainPage(
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const withBackButton: PageTransformation = page => {
      addBackButton(page, () => this.mainPage(parentPath, ...transformations));
    };
    const currentPageTitle = 'Меню';
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const page: NavigationPage = {
      currentContent: {
        text: `${pathString}\n\nЧем помочь?`,
        attachment: undefined,
        buttons: undefined,
      },
      navigationButtons: [
        [
          {
            text: 'Краткий гайд: быстрый старт',
            generateMessage: () =>
              toOutput(this.quickStartMenuPage(path, withBackButton)),
          },
        ],
        [
          {
            text: 'Популярные команды',
            generateMessage: () =>
              toOutput(this.popularCommandsMenuPage(path, withBackButton)),
          },
        ],
        [
          {
            text: 'Список команд',
            generateMessage: () =>
              toOutput(this.commandListPage(path, withBackButton)),
          },
        ],
        [
          {
            text: 'Помощь по конкретной команде',
            generateMessage: () =>
              toOutput(this.commandHelpMenuPage(0, path, withBackButton)),
          },
        ],
        [
          {
            text: 'Завершить',
            generateMessage: () =>
              toOutput(this.textPage('Работа с меню завершена')),
          },
        ],
      ],
    };
    return transformed(page, ...transformations);
  }

  async quickStartMenuPage(
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const withBackButton: PageTransformation = page => {
      addBackButton(page, () =>
        this.quickStartMenuPage(parentPath, ...transformations)
      );
    };
    const currentPageTitle = 'Быстрый старт';
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const page: NavigationPage = {
      currentContent: {
        text: `${pathString}\n\nВыберите сервер`,
        attachment: undefined,
        buttons: undefined,
      },
      navigationButtons: [
        ...ALL_OSU_SERVER_KEYS.map(serverName => [
          {
            text: serverName,
            generateMessage: () =>
              toOutput(
                this.quickStartGuidePage(
                  OsuServer[serverName],
                  path,
                  withBackButton
                )
              ),
          },
        ]),
      ],
    };
    return transformed(page, ...transformations);
  }

  async quickStartGuidePage(
    server: OsuServer,
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const currentPageTitle = OsuServer[server];
    const path = [...(parentPath ?? []), currentPageTitle];
    const setUsernameCommandText: string | undefined = (() => {
      const setUsernameCommand = this.otherCommands.find(
        c => c instanceof SetUsername
      );
      if (setUsernameCommand === undefined) {
        return undefined;
      }
      return setUsernameCommand.unparse({
        server: server,
        username: 'ваш_ник',
      });
    })();
    const [setUsernameHelpCommandText, helpCommandText]: [
      string | undefined,
      string | undefined,
    ] = (() => {
      const helpCommand = this.otherCommands.find(c => c instanceof Help);
      if (helpCommand === undefined) {
        return [undefined, undefined];
      }
      const setUsernameText = helpCommand.unparse({
        commandPrefix: SetUsername.prefixes[0],
      });
      const helpText = helpCommand.unparse({});
      return [setUsernameText, helpText];
    })();
    if (
      setUsernameHelpCommandText === undefined ||
      helpCommandText === undefined
    ) {
      console.error(`Could not generate ${Help.name} command text`);
      return this.generatePageErrorPage(path, ...transformations);
    }
    const userInfoCommandText: string | undefined = (() => {
      const userInfoCommand = this.otherCommands.find(
        c => c instanceof UserInfo
      );
      if (userInfoCommand === undefined) {
        return undefined;
      }
      return userInfoCommand.unparse({
        server: server,
      });
    })();
    if (userInfoCommandText === undefined) {
      console.error(`Could not generate ${UserInfo.name} command text`);
      return this.generatePageErrorPage(path, ...transformations);
    }
    const topPlaysCommandText: string | undefined = (() => {
      const topPlaysCommand = this.otherCommands.find(
        c => c instanceof UserBestPlays
      );
      if (topPlaysCommand === undefined) {
        return undefined;
      }
      return topPlaysCommand.unparse({
        server: server,
      });
    })();
    if (topPlaysCommandText === undefined) {
      console.error(`Could not generate ${UserBestPlays.name} command text`);
      return this.generatePageErrorPage(path, ...transformations);
    }
    const recentPlaysCommandText: string | undefined = (() => {
      const recentPlaysCommand = this.otherCommands.find(
        c => c instanceof UserRecentPlays
      );
      if (recentPlaysCommand === undefined) {
        return undefined;
      }
      return recentPlaysCommand.unparse({
        server: server,
        passesOnly: false,
      });
    })();
    if (recentPlaysCommandText === undefined) {
      console.error(`Could not generate ${UserRecentPlays.name} command text`);
      return this.generatePageErrorPage(path, ...transformations);
    }
    const text = `

1. Привяжите ник с помощью команды «${setUsernameCommandText}»
Это позволит не указывать ник в других командах
По умолчанию устанавливается режим, указанный основным в профиле на сайте игры
Если нужно установить другой режим, смотрите как это сделать в помощи по команде: «${setUsernameHelpCommandText}»

2. Теперь вы можете показать свой профиль («${userInfoCommandText}»), топ скоры («${topPlaysCommandText}») или последние плеи («${recentPlaysCommandText}»)
Для полного списка команд используйте «${helpCommandText}»

Команды могут иметь несколько вариантов написания: сокращенные и более выразительные, используйте наиболее удобный для вас вариант

Как правило, регистр написания не имеет значения, и можно писать хоть большими буквами, хоть маленькими (и даже заборчиком)

Для просмотра помощи по любой команде добавьте к «${helpCommandText}» префикс команды (как в конце пункта 1.)

⚠ Если возникли трудности при использовании бота или хотите сообщить о баге или идее ⚠
Можно написать админу, начав сообщение с [club${this.groupId}|упоминания бота] (через @ в групповом чате или [club<ид_бота>|osubot] в личных сообщениях, где <ид_бота> это ${this.groupId})
Обратите внимание, что админ увидит только сообщение, которое начинается с упоминания, но не предыдущие или следующие сообщения
Если ваш вопрос связан с другими сообщениями, добавьте их к своему сообщению либо цитируя («Ответить») либо прикрепляя («Переслать»)

    `.trim();
    return this.textPage(text, path, ...transformations);
  }

  async popularCommandsMenuPage(
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const withBackButton: PageTransformation = page => {
      addBackButton(page, () =>
        this.popularCommandsMenuPage(parentPath, ...transformations)
      );
    };
    const currentPageTitle = 'Популярные команды';
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const page: NavigationPage = {
      currentContent: {
        text: `${pathString}\n\nВыберите сервер`,
        attachment: undefined,
        buttons: undefined,
      },
      navigationButtons: [
        ...ALL_OSU_SERVER_KEYS.map(serverName => [
          {
            text: serverName,
            generateMessage: () =>
              toOutput(
                this.popularCommandsPage(
                  OsuServer[serverName],
                  path,
                  withBackButton
                )
              ),
          },
        ]),
      ],
    };
    return transformed(page, ...transformations);
  }

  async popularCommandsPage(
    server: OsuServer,
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const currentPageTitle = OsuServer[server];
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const commandButtons = this.createCommandButtons(server);
    if (commandButtons === undefined) {
      console.error(
        `Could not generate buttons for commands on ${OsuServer[server]}`
      );
      return this.generatePageErrorPage(path, ...transformations);
    }
    const page: NavigationPage = {
      currentContent: {
        text: pathString,
        attachment: undefined,
        buttons: commandButtons,
      },
    };
    return transformed(page, ...transformations);
  }

  async commandListPage(
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const currentPageTitle = 'Список команд';
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const helpCommand = this.otherCommands.find(c => c instanceof HelpVk);
    if (helpCommand === undefined) {
      console.error(`Could not find ${HelpVk.name} command`);
      return this.generatePageErrorPage(path, ...transformations);
    }
    const helpCommandOutput: VkOutputMessage = await (async () => {
      const processingResult = helpCommand.process({}).resultValue;
      const viewResult = helpCommand.createOutputMessage(
        await processingResult
      ).resultValue;
      return await viewResult;
    })();
    const page: NavigationPage = {
      currentContent: {
        text: `${pathString}\n\n` + helpCommandOutput.text,
        attachment: helpCommandOutput.attachment,
        buttons: helpCommandOutput.buttons,
      },
    };
    return transformed(page, ...transformations);
  }

  async commandHelpMenuPage(
    pageIndex: number,
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const withBackButton: PageTransformation = page => {
      addBackButton(page, () =>
        this.commandHelpMenuPage(pageIndex, parentPath, ...transformations)
      );
    };
    // since we don't yet know if it is a single-page menu
    // or should we display page number
    const earlyPageTitle = 'Помощь по командам';
    const earlyPath = [...(parentPath ?? []), earlyPageTitle];
    const helpCommand = this.otherCommands.find(c => c instanceof HelpVk);
    if (helpCommand === undefined) {
      console.error(`Could not find ${HelpVk.name} command`);
      return this.generatePageErrorPage(earlyPath, ...transformations);
    }
    const getLongestPrefix = (prefixes: string[]): string => {
      const maxPrefixLength = Math.max(...prefixes.map(p => p.length));
      const longestPrefix = prefixes.find(p => p.length === maxPrefixLength);
      if (longestPrefix === undefined) {
        throw Error('Could not find longest command prefix');
      }
      return longestPrefix;
    };
    const representativePrefixes: string[] = (() => {
      const commandOverrides = Object.keys(helpCommand.commandCategories)
        .map(category => helpCommand.commandCategories[category])
        .flat();
      const prefixes: string[] = [];
      for (const command of [...helpCommand.commands, helpCommand]) {
        const prefixOverrides = commandOverrides
          .filter(o => o.command === command)
          .map(o => o.selectedPrefixes)
          .filter(selection => selection !== undefined);
        if (prefixOverrides.length === 0) {
          prefixes.push(getLongestPrefix(command.prefixes));
        } else {
          for (const override of prefixOverrides) {
            prefixes.push(getLongestPrefix(override));
          }
        }
      }
      if (commandOverrides.length > 0) {
        prefixes.sort((a, b) => {
          const aOverride = commandOverrides.find(o =>
            (o.selectedPrefixes ?? o.command.prefixes).matchIgnoringCase(a)
          );
          const bOverride = commandOverrides.find(o =>
            (o.selectedPrefixes ?? o.command.prefixes).matchIgnoringCase(b)
          );
          const aSortValue =
            aOverride === undefined ? 999 : commandOverrides.indexOf(aOverride);
          const bSortValue =
            bOverride === undefined ? 999 : commandOverrides.indexOf(bOverride);
          return aSortValue - bSortValue;
        });
      }
      return prefixes;
    })();
    const prefixRows: string[][] = [];
    for (let i = 0; i < representativePrefixes.length; i += 2) {
      prefixRows.push(representativePrefixes.slice(i, i + 2));
    }
    const maxPrefixRows = 4;
    const maxPageIndex = Math.floor(prefixRows.length / maxPrefixRows);
    // now we know if we should display page number
    const currentPageTitle =
      maxPageIndex === 0
        ? earlyPageTitle
        : earlyPageTitle + ` (${pageIndex + 1})`;
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const prevPageButton = (() => {
      if (pageIndex < 1) {
        return undefined;
      }
      return {
        text: '◀ Предыдущие',
        generateMessage: () =>
          toOutput(
            this.commandHelpMenuPage(
              pageIndex - 1,
              parentPath,
              ...transformations
            )
          ),
      };
    })();
    const nextPageButton = (() => {
      if (pageIndex >= maxPageIndex) {
        return undefined;
      }
      return {
        text: 'Следующие ▶',
        generateMessage: () =>
          toOutput(
            this.commandHelpMenuPage(
              pageIndex + 1,
              parentPath,
              ...transformations
            )
          ),
      };
    })();
    const paginationButtons = [prevPageButton, nextPageButton].filter(
      b => b !== undefined
    );
    const page: NavigationPage = {
      currentContent: {
        text: `${pathString}\n\nВыберите команду`,
        attachment: undefined,
        buttons: undefined,
      },
      navigationButtons: [
        ...prefixRows
          .slice(pageIndex * maxPrefixRows, (pageIndex + 1) * maxPrefixRows)
          .map(row =>
            row.map(prefix => ({
              text: prefix,
              generateMessage: () =>
                toOutput(this.commandHelpPage(prefix, path, withBackButton)),
            }))
          ),
        ...(paginationButtons.length !== 0 ? [paginationButtons] : []),
      ],
    };
    return transformed(page, ...transformations);
  }

  async commandHelpPage(
    prefix: string,
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const withBackButton: PageTransformation = page => {
      addBackButton(page, () =>
        this.commandHelpPage(prefix, parentPath, ...transformations)
      );
    };
    const currentPageTitle = prefix;
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const helpCommand = this.otherCommands.find(c => c instanceof HelpVk);
    if (helpCommand === undefined) {
      console.error(`Could not find ${HelpVk.name} command`);
      return this.generatePageErrorPage(path, ...transformations);
    }
    const usageVariants = Object.keys(
      helpCommand.commands.find(c => c.prefixes.matchIgnoringCase(prefix))
        ?.argGroups ?? {}
    );
    if (usageVariants.length > 0) {
      const variantRows: string[][] = [];
      for (let i = 0; i < usageVariants.length; i += 2) {
        variantRows.push(usageVariants.slice(i, i + 2));
      }
      const page: NavigationPage = {
        currentContent: {
          text: `${pathString}\n\nВыберите вариант команды`,
          attachment: undefined,
          buttons: undefined,
        },
        navigationButtons: variantRows.map(row =>
          row.map(variant => ({
            text: variant,
            generateMessage: () =>
              toOutput(
                this.commandVariantHelpPage(
                  prefix,
                  variant,
                  path,
                  withBackButton
                )
              ),
          }))
        ),
      };
      return transformed(page, ...transformations);
    }
    const helpCommandOutput: VkOutputMessage = await (async () => {
      const processingResult = helpCommand.process({
        commandPrefix: prefix,
      }).resultValue;
      const viewResult = helpCommand.createOutputMessage(
        await processingResult
      ).resultValue;
      return await viewResult;
    })();
    const page: NavigationPage = {
      currentContent: {
        text: `${pathString}\n\n` + helpCommandOutput.text,
        attachment: helpCommandOutput.attachment,
        buttons: helpCommandOutput.buttons,
      },
    };
    return transformed(page, ...transformations);
  }

  async commandVariantHelpPage(
    prefix: string,
    usageVariant: string,
    parentPath?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const currentPageTitle = usageVariant;
    const path = [...(parentPath ?? []), currentPageTitle];
    const pathString = getPathString(path);
    const helpCommand = this.otherCommands.find(c => c instanceof HelpVk);
    if (helpCommand === undefined) {
      console.error(`Could not find ${HelpVk.name} command`);
      return this.generatePageErrorPage(path, ...transformations);
    }
    const helpCommandOutput: VkOutputMessage = await (async () => {
      const processingResult = helpCommand.process({
        commandPrefix: prefix,
        usageVariant: usageVariant,
      }).resultValue;
      const viewResult = helpCommand.createOutputMessage(
        await processingResult
      ).resultValue;
      return await viewResult;
    })();
    const page: NavigationPage = {
      currentContent: {
        text: `${pathString}\n\n` + helpCommandOutput.text,
        attachment: helpCommandOutput.attachment,
        buttons: helpCommandOutput.buttons,
      },
    };
    return transformed(page, ...transformations);
  }

  async textPage(
    text: string,
    path?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    const maybePathString =
      path !== undefined ? `${getPathString(path)}\n\n` : '';
    const page: NavigationPage = {
      currentContent: {
        text: maybePathString + text,
        attachment: undefined,
        buttons: undefined,
      },
    };
    return transformed(page, ...transformations);
  }

  async generatePageErrorPage(
    path?: string[],
    ...transformations: PageTransformation[]
  ): Promise<NavigationPage> {
    return this.textPage(
      'Произошла ошибка при генерации страницы',
      path,
      ...transformations
    );
  }

  createCommandButtons(
    server: OsuServer
  ): VkOutputMessageButton[][] | undefined {
    type ButtonInfo = {text: string; command: string};
    const userInfo: ButtonInfo | undefined = (() => {
      const userInfoCommand = this.otherCommands.find(
        c => c instanceof UserInfo
      );
      if (userInfoCommand === undefined) {
        return undefined;
      }
      const commandText = userInfoCommand.unparse({
        server: server,
      });
      return {text: 'Моя статистика', command: commandText};
    })();
    const topPlays: ButtonInfo | undefined = (() => {
      const bestPlaysCommand = this.otherCommands.find(
        c => c instanceof UserBestPlays
      );
      if (bestPlaysCommand === undefined) {
        return undefined;
      }
      const commandText = bestPlaysCommand.unparse({
        server: server,
      });
      return {text: 'Моя лучшие скоры', command: commandText};
    })();
    const recentPlays: ButtonInfo | undefined = (() => {
      const recentPlaysCommand = this.otherCommands.find(
        c => c instanceof UserRecentPlays
      );
      if (recentPlaysCommand === undefined) {
        return undefined;
      }
      const commandText = recentPlaysCommand.unparse({
        server: server,
        passesOnly: false,
      });
      return {text: 'Мой последний скор', command: commandText};
    })();
    const mapInfo: ButtonInfo | undefined = (() => {
      const mapInfoCommand = this.otherCommands.find(
        c => c instanceof BeatmapInfo
      );
      if (mapInfoCommand === undefined) {
        return undefined;
      }
      const commandText = mapInfoCommand.unparse({
        server: server,
      });
      return {text: 'Информация о карте', command: commandText};
    })();
    const bestPlaysOnMap: ButtonInfo | undefined = (() => {
      const bestPlaysOnMapCommand = this.otherCommands.find(
        c => c instanceof UserBestPlaysOnMap
      );
      if (bestPlaysOnMapCommand === undefined) {
        return undefined;
      }
      const commandText = bestPlaysOnMapCommand.unparse({
        server: server,
      });
      return {text: 'Мой скор на карте', command: commandText};
    })();
    const chatLeaderboardOnMap: ButtonInfo | undefined = (() => {
      const chatLeaderboardOnMapCommand = this.otherCommands.find(
        c => c instanceof ChatLeaderboardOnMap
      );
      if (chatLeaderboardOnMapCommand === undefined) {
        return undefined;
      }
      const commandText = chatLeaderboardOnMapCommand.unparse({
        server: server,
      });
      return {text: 'Топ чата на карте', command: commandText};
    })();
    const chatLeaderboard: ButtonInfo | undefined = (() => {
      const chatLeaderboardCommand = this.otherCommands.find(
        c => c instanceof ChatLeaderboard
      );
      if (chatLeaderboardCommand === undefined) {
        return undefined;
      }
      const commandText = chatLeaderboardCommand.unparse({
        server: server,
      });
      return {text: 'Топ игроков чата', command: commandText};
    })();
    const allCommandButtons = [
      [userInfo, mapInfo],
      [topPlays, bestPlaysOnMap],
      [recentPlays, chatLeaderboardOnMap],
      [chatLeaderboard],
    ];
    if (allCommandButtons.flat().includes(undefined)) {
      return undefined;
    }
    return allCommandButtons as ButtonInfo[][];
  }
}

type NavigationPage = {
  currentContent?: VkOutputMessageContent;
  navigationButtons?: {
    text: string;
    generateMessage: () => MaybeDeferred<VkOutputMessage>;
  }[][];
};

function addBackButton(
  page: NavigationPage,
  getTargetPage: () => Promise<NavigationPage>
): void {
  page.navigationButtons = [
    ...(page.navigationButtons ?? []),
    [
      {
        text: 'Назад',
        generateMessage: () => toOutput(getTargetPage()),
      },
    ],
  ];
}

function getPathString(navigationPath: string[]): string {
  return `[ ${navigationPath.join(' / ')} ]`;
}

type PageTransformation = (page: NavigationPage) => void | Promise<void>;

async function transformed(
  page: NavigationPage,
  ...transformations: PageTransformation[]
): Promise<NavigationPage> {
  for (const transform of transformations) {
    await transform(page);
  }
  return page;
}

function toOutput(
  page: Promise<NavigationPage>
): MaybeDeferred<VkOutputMessage> {
  const valuePromise = (async () => {
    const outputMessage: VkOutputMessage = {
      text: undefined,
      attachment: undefined,
      buttons: undefined,
      navigation: await page,
    };
    return outputMessage;
  })();
  return MaybeDeferred.fromInstantPromise(valuePromise);
}

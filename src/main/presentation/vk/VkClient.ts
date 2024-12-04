import {randomUUID} from 'crypto';
import {ButtonColor, Keyboard, KeyboardBuilder, VK} from 'vk-io';
import {APP_CODE_NAME} from '../../App';
import {CalculationType} from '../../primitives/MaybeDeferred';
import {Timespan} from '../../primitives/Timespan';
import {TextCommand} from '../commands/base/TextCommand';
import {CommandMatchResult, MatchLevel} from '../common/CommandMatchResult';
import {VkIdConverter} from './VkIdConverter';
import {VkMessageContext} from './VkMessageContext';
import {
  ReplySenderInfo,
  VkNavigationCaption,
  VkOutputMessage,
  VkOutputMessageButton,
} from './VkOutputMessage';

type UnknownExecutionParams = unknown;
type UnknownViewParams = unknown;

export class VkClient {
  readonly vk: VK;
  readonly groupId: number;
  readonly adminIds: readonly number[];
  readonly publicCommands: TextCommand<
    UnknownExecutionParams,
    UnknownViewParams,
    VkMessageContext,
    VkOutputMessage
  >[] = [];
  readonly adminCommands: TextCommand<
    UnknownExecutionParams,
    UnknownViewParams,
    VkMessageContext,
    VkOutputMessage
  >[] = [];
  readonly initActions: (() => Promise<void>)[] = [];
  readonly preprocessors: ((
    ctx: VkMessageContext
  ) => Promise<VkMessageContext>)[] = [];
  readonly kbLayouts: {[lang: string]: readonly string[]} = {
    en: (
      "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./" +
      '~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?'
    ).split(''),
    ru: (
      'ё1234567890-=йцукенгшщзхъ\\фывапролджэячсмитьбю.' +
      'Ё!"№;%:?*()_+ЙЦУКЕНГШЩЗХЪ/ФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,'
    ).split(''),
  };

  onCommandMatch: ((
    matchResult: CommandMatchResult<UnknownExecutionParams>,
    command: TextCommand<
      UnknownExecutionParams,
      UnknownViewParams,
      VkMessageContext,
      VkOutputMessage
    >,
    ctx: VkMessageContext
  ) => void)[] = [];

  constructor(vk: VK, groupId: number, adminIds: number[]) {
    this.vk = vk;
    this.groupId = groupId;
    this.adminIds = adminIds;
    this.vk.updates.on('message', ctx => this.process(ctx));
    this.vk.updates.on('message_event', async ctx => {
      if (isVkPaginationPayload(ctx.eventPayload)) {
        const messageKey = ctx.eventPayload.switchPage.messageKey;
        const targetIndex = ctx.eventPayload.switchPage.targetIndex;
        const paginatedMessage = this.paginatedMessages[messageKey];
        if (paginatedMessage !== undefined) {
          console.log(
            `Executing pagination request from ${ctx.userId} in ${ctx.peerId} (payload=${JSON.stringify(ctx.eventPayload)})`
          );
          paginatedMessage.goTo(targetIndex);
        } else {
          console.log(
            `Invalid pagination request from ${ctx.userId} in ${ctx.peerId} (payload=${JSON.stringify(ctx.eventPayload)})`
          );
          // Bot probably crashed and can't switch pages on this message anymore
          // So we try to remove callback buttons
          const messages =
            await this.vk.api.messages.getByConversationMessageId({
              group_id: this.groupId,
              peer_id: ctx.peerId,
              conversation_message_ids: [ctx.conversationMessageId],
            });
          const targetMessage = messages.items[0];
          if (targetMessage === undefined) {
            console.error('Could not get own message with callback buttons');
            return;
          }
          const targetText = targetMessage.text;
          const targetAttachment =
            targetMessage.attachments.length > 0
              ? targetMessage.attachments
                  .map(a => {
                    let type: string | undefined = undefined;
                    let ownerId: number | undefined = undefined;
                    let id: number | undefined = undefined;
                    for (const key in a) {
                      if (key === 'type') {
                        type = a[key];
                      } else {
                        if (a[key].owner_id !== undefined) {
                          ownerId = a[key].owner_id;
                        }
                        if (a[key].owner_id !== undefined) {
                          id = a[key].id;
                        }
                      }
                    }
                    if ((type && ownerId && id) === undefined) {
                      return undefined;
                    }
                    return `${type}${ownerId}_${id}`;
                  })
                  .filter(a => a !== undefined)
                  .join(',')
              : undefined;
          const targetKeyboard = (() => {
            const kb = Object.assign({}, targetMessage.keyboard);
            kb.buttons = kb.buttons
              ?.map((row: {action?: {type?: string; payload?: string}}[]) =>
                row.filter(b => {
                  if (b.action?.type !== 'callback') {
                    return true;
                  }
                  if (typeof b.action?.payload !== 'string') {
                    return true;
                  }
                  try {
                    if (JSON.parse(b.action.payload).switchPage !== undefined) {
                      return false;
                    }
                  } catch {
                    return true;
                  }
                  return true;
                })
              )
              .filter((row: unknown[]) => row.length > 0);
            delete kb.author_id;
            return kb;
          })();
          await this.vk.api.messages.edit({
            group_id: this.groupId,
            peer_id: ctx.peerId,
            conversation_message_id: ctx.conversationMessageId,
            message: targetText,
            attachment: targetAttachment,
            keyboard: JSON.stringify(targetKeyboard),
          });
        }
      }
      if (isVkNavigationPayload(ctx.eventPayload)) {
        const messageKey = ctx.eventPayload.navigate.messageKey;
        const targetIndex = ctx.eventPayload.navigate.targetIndex;
        const navigationMessage = this.navigationMessages[messageKey];
        if (navigationMessage !== undefined) {
          console.log(
            `Executing navigation request from ${ctx.userId} in ${ctx.peerId} (payload=${JSON.stringify(ctx.eventPayload)})`
          );
          const owner = navigationMessage.ownerId;
          if (owner !== undefined && ctx.userId !== owner) {
            await ctx.answer({
              type: 'show_snackbar',
              text: 'Вы не можете управлять этим сообщением!',
            });
            return;
          }
          await navigationMessage.goTo(targetIndex);
        } else {
          console.log(
            `Invalid navigation request from ${ctx.userId} in ${ctx.peerId} (payload=${JSON.stringify(ctx.eventPayload)})`
          );
          // Bot probably crashed and can't switch pages on this message anymore
          // So we try to remove callback buttons
          const messages =
            await this.vk.api.messages.getByConversationMessageId({
              group_id: this.groupId,
              peer_id: ctx.peerId,
              conversation_message_ids: [ctx.conversationMessageId],
            });
          const targetMessage = messages.items[0];
          if (targetMessage === undefined) {
            console.error('Could not get own message with callback buttons');
            return;
          }
          const targetAttachment =
            targetMessage.attachments.length > 0
              ? targetMessage.attachments
                  .map(a => {
                    let type: string | undefined = undefined;
                    let ownerId: number | undefined = undefined;
                    let id: number | undefined = undefined;
                    for (const key in a) {
                      if (key === 'type') {
                        type = a[key];
                      } else {
                        if (a[key].owner_id !== undefined) {
                          ownerId = a[key].owner_id;
                        }
                        if (a[key].owner_id !== undefined) {
                          id = a[key].id;
                        }
                      }
                    }
                    if ((type && ownerId && id) === undefined) {
                      return undefined;
                    }
                    return `${type}${ownerId}_${id}`;
                  })
                  .filter(a => a !== undefined)
                  .join(',')
              : undefined;
          const targetKeyboard = (() => {
            const kb = Object.assign({}, targetMessage.keyboard);
            kb.buttons = kb.buttons
              ?.map((row: {action?: {type?: string; payload?: string}}[]) =>
                row.filter(b => {
                  if (b.action?.type !== 'callback') {
                    return true;
                  }
                  if (typeof b.action?.payload !== 'string') {
                    return true;
                  }
                  try {
                    if (JSON.parse(b.action.payload).navigate !== undefined) {
                      return false;
                    }
                  } catch {
                    return true;
                  }
                  return true;
                })
              )
              .filter((row: unknown[]) => row.length > 0);
            delete kb.author_id;
            return kb;
          })();
          await this.vk.api.messages.edit({
            group_id: this.groupId,
            peer_id: ctx.peerId,
            conversation_message_id: ctx.conversationMessageId,
            message:
              'Меню стало недействительно из-за внезапной перезагрузки бота',
            attachment: targetAttachment,
            keyboard: JSON.stringify(targetKeyboard),
          });
        }
      }
    });
  }

  async start(): Promise<void> {
    console.log('VK client starting...');

    const initPromises = this.initActions.map(x => x());
    await Promise.all(initPromises);
    console.log('VK client initialized successfully');

    await this.vk.updates.start();
    console.log('VK updates started');

    this.startPaginationCleanups({
      intervalMs: 15e3,
      expireTime: new Timespan().addMinutes(5),
    });
    console.log('Pagination cleanups started');

    this.startNavigationCleanups({
      intervalMs: 15e3,
      expireTime: new Timespan().addMinutes(5),
    });
    console.log('Navigation cleanups started');

    console.log('VK client started!');
  }

  async stop(): Promise<void> {
    console.log('VK client stopping...');

    await this.vk.updates.stop();
    console.log('VK updates stopped');

    this.stopPaginationCleanups();
    console.log('Pagination cleanups stopped');

    this.stopNavigationCleanups();
    console.log('Navigation cleanups stopped');

    const paginatedMessagesCount = Object.values(this.paginatedMessages).length;
    if (paginatedMessagesCount > 0) {
      this.cleanUpPaginatedMessages(0);
      const cleanUpCount =
        paginatedMessagesCount - Object.values(this.paginatedMessages).length;
      console.log(
        `Successfull pagination cleanup count: ${cleanUpCount}/${paginatedMessagesCount}`
      );
    }

    const navigationMessagesCount = Object.values(
      this.navigationMessages
    ).length;
    if (navigationMessagesCount > 0) {
      await this.cleanUpNavigationMessages(0, 'botStopped');
      const cleanUpCount =
        navigationMessagesCount - Object.values(this.navigationMessages).length;
      console.log(
        `Successfull navigation cleanup count: ${cleanUpCount}/${navigationMessagesCount}`
      );
    }

    console.log('VK client stopped!');
  }

  private async process(ctx: VkMessageContext): Promise<void> {
    const consumed = await this.handleNavigationByReply(ctx);
    if (consumed) {
      return;
    }
    const allLayouts = [this.kbLayouts.en, this.kbLayouts.ru];
    let bestCommandMatch: BestCommandMatch | undefined = undefined;
    for (const layout of allLayouts) {
      const ctxCopy = Object.assign({}, ctx);
      Object.setPrototypeOf(ctxCopy, Object.getPrototypeOf(ctx));
      const layoutBestMatch = await this.processWithKbLayout(layout, ctxCopy);
      const layoutMatchLevel = layoutBestMatch?.matchResult.matchLevel ?? 0;
      if (layoutMatchLevel > (bestCommandMatch?.matchResult.matchLevel ?? 0)) {
        bestCommandMatch = layoutBestMatch;
      }
      if (layoutMatchLevel === MatchLevel.FULL_MATCH) {
        break;
      }
    }
    if (bestCommandMatch !== undefined) {
      for (const onMatch of this.onCommandMatch) {
        onMatch(
          bestCommandMatch.matchResult,
          bestCommandMatch.command,
          bestCommandMatch.ctx
        );
      }
    }
  }

  private async processWithKbLayout(
    layout: readonly string[],
    ctx: VkMessageContext
  ): Promise<BestCommandMatch | undefined> {
    const originalText = ctx.text;
    if (originalText !== undefined && layout !== this.kbLayouts.en) {
      ctx.text = originalText
        .split('')
        .map(c => {
          const layoutCharIndex = layout.indexOf(c);
          if (layoutCharIndex !== -1) {
            return this.kbLayouts.en[layoutCharIndex];
          }
          const englishCharIndex = this.kbLayouts.en.indexOf(c);
          if (englishCharIndex !== -1) {
            return layout[englishCharIndex];
          }
          return c;
        })
        .join('');
      if (ctx.text === originalText) {
        return undefined;
      }
    }
    for (const preproces of this.preprocessors) {
      ctx = await preproces(ctx);
    }
    let bestMatch: BestCommandMatch | undefined = undefined;
    for (const command of this.publicCommands) {
      const matchResult = await this.tryExecuteCommand(command, ctx);
      if (matchResult.matchLevel > (bestMatch?.matchResult.matchLevel ?? 0)) {
        bestMatch = {
          matchResult: matchResult,
          command: command,
          ctx: ctx,
        };
      }
      if (matchResult.isFullMatch) {
        return bestMatch;
      }
    }
    if (this.adminIds.includes(ctx.senderId)) {
      for (const command of this.adminCommands) {
        const matchResult = await this.tryExecuteCommand(command, ctx);
        if (matchResult.matchLevel > (bestMatch?.matchResult.matchLevel ?? 0)) {
          bestMatch = {
            matchResult: matchResult,
            command: command,
            ctx: ctx,
          };
        }
        if (matchResult.isFullMatch) {
          return bestMatch;
        }
      }
    }
    return bestMatch;
  }

  private async tryExecuteCommand(
    command: TextCommand<
      UnknownExecutionParams,
      UnknownViewParams,
      VkMessageContext,
      VkOutputMessage
    >,
    ctx: VkMessageContext
  ): Promise<CommandMatchResult<UnknownExecutionParams>> {
    const commandExecutionStart = Date.now();
    const matchResult = command.matchMessage(ctx);
    if (!matchResult.isFullMatch) {
      return matchResult;
    }
    let replyMessagePromise: Promise<VkMessageContext> | undefined = undefined;
    const sendExecutionNotificationIfNeeded = (
      type: CalculationType
    ): Promise<VkMessageContext> | undefined => {
      if (replyMessagePromise !== undefined) {
        return replyMessagePromise;
      }
      switch (type) {
        case CalculationType.RemoteNetworkCalls:
          return ctx.reply('Команда выполняется...');
        case CalculationType.LongBackgroundWork:
          return ctx.reply(
            'Выполняется потенциально тяжелый запрос, составление ответа может занять некоторое время...'
          );
        default:
          return replyMessagePromise;
      }
    };
    const executionArgs = matchResult.commandArgs!;
    console.log(
      `Trying to execute command ${
        command.internalName
      } (args=${JSON.stringify(executionArgs)})`
    );
    try {
      const processingWork = command.process(executionArgs, ctx);
      replyMessagePromise = sendExecutionNotificationIfNeeded(
        processingWork.calculationType
      );
      const viewParams = await processingWork.resultValue;
      const outputCreationWork = command.createOutputMessage(viewParams);
      replyMessagePromise = sendExecutionNotificationIfNeeded(
        outputCreationWork.calculationType
      );
      const outputMessage = await outputCreationWork.resultValue;
      const commandExecutionTime = Date.now() - commandExecutionStart;
      console.log(
        `Command ${command.internalName} executed in ${commandExecutionTime}ms`
      );
      if (outputMessage.pagination !== undefined) {
        await this.replyWithPagination(ctx, replyMessagePromise, outputMessage);
        return matchResult;
      }
      if (outputMessage.navigation !== undefined) {
        await this.replyWithNavigation(ctx, replyMessagePromise, outputMessage);
        return matchResult;
      }
      if (!outputMessage.text && !outputMessage.attachment) {
        if (replyMessagePromise !== undefined) {
          const botMessage = await replyMessagePromise;
          await botMessage.editMessage({message: 'Команда выполнена'});
        } else {
          ctx.reply('Команда выполнена');
        }
        return matchResult;
      }
      const text = outputMessage.text ?? '';
      const attachment = outputMessage.attachment;
      const buttons = outputMessage.buttons;
      const keyboard = buttons && this.createKeyboard(buttons);
      if (replyMessagePromise !== undefined) {
        const botMessage = await replyMessagePromise;
        await botMessage.editMessage({message: text, attachment, keyboard});
      } else {
        ctx.reply(text, {attachment, keyboard});
      }
    } catch (e) {
      console.error(e);
      if (replyMessagePromise !== undefined) {
        const botMessage = await replyMessagePromise;
        await botMessage.editMessage({
          message: 'Произошла ошибка при выполнении команды',
        });
      } else {
        ctx.reply('Произошла ошибка при выполнении команды');
      }
    }
    return matchResult;
  }

  createKeyboard(
    buttons: VkOutputMessageButton[][]
  ): KeyboardBuilder | undefined {
    if (!buttons.length) {
      return undefined;
    }
    const keyboard = Keyboard.builder().inline(true);
    for (const row of buttons) {
      for (const button of row) {
        keyboard.textButton({
          label:
            button.text.length > 40
              ? button.text.substring(0, 37) + '...'
              : button.text,
          payload: {
            target: APP_CODE_NAME,
            command: button.command,
          },
        });
      }
      keyboard.row();
    }
    return keyboard;
  }

  private paginationCleanupsJob: NodeJS.Timeout | undefined = undefined;
  startPaginationCleanups({
    intervalMs,
    expireTime,
  }: {
    intervalMs: number;
    expireTime: Timespan;
  }): void {
    const expireTimeMs = expireTime.totalMiliseconds();
    this.paginationCleanupsJob ??= setInterval(() => {
      this.cleanUpPaginatedMessages(expireTimeMs);
    }, intervalMs);
  }
  cleanUpPaginatedMessages(maxAgeMs: number): void {
    const now = Date.now();
    for (const entry of Object.values(this.paginatedMessages)) {
      if (now >= entry.creationTime + maxAgeMs) {
        entry.onExpire();
      }
    }
  }
  stopPaginationCleanups(): void {
    if (this.paginationCleanupsJob !== undefined) {
      clearInterval(this.paginationCleanupsJob);
    }
  }

  private paginatedMessages: {
    [key: string]: {
      creationTime: number;
      peerId: number;
      goTo: (index: number) => void;
      onExpire: () => void;
    };
  } = {};
  private async replyWithPagination(
    ctx: VkMessageContext,
    replyMessagePromise: Promise<VkMessageContext> | undefined,
    outputMessage: VkOutputMessage
  ): Promise<void> {
    const allowedPaginatedMessages = 3;
    let foundPaginatedMessages = 0;
    const allPaginatedMessages = [...Object.values(this.paginatedMessages)];
    for (const paginatedMessage of allPaginatedMessages.reverse()) {
      if (paginatedMessage.peerId === ctx.peerId) {
        foundPaginatedMessages += 1;
        if (foundPaginatedMessages >= allowedPaginatedMessages) {
          paginatedMessage.onExpire();
        }
      }
    }
    const pagination = outputMessage.pagination!;
    type DisplayMessage = {
      text: string | undefined;
      attachment: string | undefined;
      keyboard: KeyboardBuilder | undefined;
    };
    const createMessage: (
      targetIndex: number,
      paginationEnabled: boolean,
      messageKey: string
    ) => DisplayMessage | undefined = (i, paginationEnabled, messageKey) => {
      const content = pagination.contents[i];
      if (content === undefined) {
        return;
      }
      const text = content.text ?? '';
      const attachment = content.attachment;
      const buttons = content.buttons ?? [];
      const keyboard = Keyboard.builder().inline(true);
      const buttonPrevText = pagination.buttonText(i, i - 1);
      const buttonNextText = pagination.buttonText(i, i + 1);
      if (
        paginationEnabled &&
        (buttonPrevText !== undefined || buttonNextText !== undefined)
      ) {
        if (buttonPrevText !== undefined) {
          keyboard.callbackButton({
            label:
              buttonPrevText.length > 40
                ? buttonPrevText.substring(0, 37) + '...'
                : buttonPrevText,
            payload: {
              target: APP_CODE_NAME,
              switchPage: {
                messageKey: messageKey,
                targetIndex: i - 1,
              },
            } as VkPaginationButtonPayload,
          });
        }
        if (buttonNextText !== undefined) {
          keyboard.callbackButton({
            label:
              buttonNextText.length > 40
                ? buttonNextText.substring(0, 37) + '...'
                : buttonNextText,
            payload: {
              target: APP_CODE_NAME,
              switchPage: {
                messageKey: messageKey,
                targetIndex: i + 1,
              },
            } as VkPaginationButtonPayload,
          });
        }
        keyboard.row();
      }
      for (const row of buttons) {
        for (const button of row) {
          keyboard.textButton({
            label:
              button.text.length > 40
                ? button.text.substring(0, 37) + '...'
                : button.text,
            payload: {
              target: APP_CODE_NAME,
              command: button.command,
            },
          });
        }
        keyboard.row();
      }
      return {
        text: text,
        attachment: attachment,
        keyboard: keyboard,
      };
    };
    let lastTargetIndex = pagination.startingIndex;
    const messageKey = randomUUID();
    const botMessageCtx = await (async () => {
      const firstMessage = createMessage(
        pagination.startingIndex,
        true,
        messageKey
      );
      if (firstMessage === undefined) {
        throw Error('Could not create first page of the message');
      }
      const text = firstMessage.text ?? '';
      const attachment = firstMessage.attachment;
      const keyboard = firstMessage.keyboard;
      if (replyMessagePromise !== undefined) {
        const botMessage = await replyMessagePromise;
        await botMessage.editMessage({
          message: text,
          attachment,
          keyboard,
        });
        return botMessage;
      } else {
        return await ctx.reply(text, {attachment, keyboard});
      }
    })();
    this.paginatedMessages[messageKey] = {
      creationTime: Date.now(),
      peerId: ctx.peerId,
      goTo: index => {
        const targetMessage = createMessage(index, true, messageKey);
        if (targetMessage === undefined) {
          return;
        }
        const text = targetMessage.text ?? '';
        const attachment = targetMessage.attachment;
        const keyboard = targetMessage.keyboard;
        botMessageCtx.editMessage({message: text, attachment, keyboard});
        lastTargetIndex = index;
      },
      onExpire: () => {
        const targetMessage = createMessage(lastTargetIndex, false, messageKey);
        if (targetMessage === undefined) {
          return;
        }
        const text = targetMessage.text ?? '';
        const attachment = targetMessage.attachment;
        const keyboard = targetMessage.keyboard;
        botMessageCtx.editMessage({message: text, attachment, keyboard});
        delete this.paginatedMessages[messageKey];
      },
    };
  }

  private navigationCleanupsJob: NodeJS.Timeout | undefined = undefined;
  startNavigationCleanups({
    intervalMs,
    expireTime,
  }: {
    intervalMs: number;
    expireTime: Timespan;
  }): void {
    const expireTimeMs = expireTime.totalMiliseconds();
    this.navigationCleanupsJob ??= setInterval(() => {
      this.cleanUpNavigationMessages(expireTimeMs, 'timeUp');
    }, intervalMs);
  }
  async cleanUpNavigationMessages(
    maxAgeMs: number,
    reason: NavigationCleanupReason
  ): Promise<void> {
    const now = Date.now();
    const onExpirePromises: Promise<void>[] = [];
    for (const entry of Object.values(this.navigationMessages)) {
      if (now >= entry.creationTime + maxAgeMs) {
        onExpirePromises.push(entry.onExpire(reason));
      }
    }
    await Promise.all(onExpirePromises);
  }
  stopNavigationCleanups(): void {
    if (this.navigationCleanupsJob !== undefined) {
      clearInterval(this.navigationCleanupsJob);
    }
  }

  private navigationMessages: {
    [key: string]: {
      creationTime: number;
      ownerId: number | undefined;
      peerId: number;
      extraContext: {
        userFullName: string | undefined;
        output: VkOutputMessage & {
          replyPayload?: {appUserId: string; text: string};
        };
        currentKeyboard: KeyboardBuilder | undefined;
        ctx: VkMessageContext;
      };
      goTo: (index: number) => Promise<void>;
      onExpire: (reason: NavigationCleanupReason) => Promise<void>;
    };
  } = {};
  private async replyWithNavigation(
    ctx: VkMessageContext,
    replyMessagePromise: Promise<VkMessageContext> | undefined,
    outputMessage: VkOutputMessage
  ): Promise<void> {
    const [userInfo] = await this.vk.api.users.get({
      user_ids: [ctx.senderId],
    });
    const userFullName =
      userInfo === undefined
        ? undefined
        : `${userInfo.first_name} ${userInfo.last_name}`;
    const allowedNavigationMessages = 3;
    let foundNavigationMessages = 0;
    const allNavigationMessages = [...Object.values(this.navigationMessages)];
    for (const navigationMessage of allNavigationMessages.reverse()) {
      if (navigationMessage.peerId === ctx.peerId) {
        foundNavigationMessages += 1;
        if (foundNavigationMessages >= allowedNavigationMessages) {
          navigationMessage.onExpire('limitReached');
        }
      }
    }
    type DisplayMessage = {
      text: string | undefined;
      attachment: string | undefined;
      keyboard: KeyboardBuilder | undefined;
      enabledCaptions: VkNavigationCaption[] | undefined;
    };
    let currentRootMessage: VkOutputMessage & {
      replyPayload?: {appUserId: string; text: string};
    } = outputMessage;
    const trySetNewRoot: (
      targetIndex: number,
      navigationEnabled: boolean,
      messageKey: string
    ) => Promise<DisplayMessage | undefined> = async (
      i,
      navigationEnabled,
      messageKey
    ) => {
      try {
        const oldNavigationPage = currentRootMessage.navigation!;
        const targetPage = await (async () => {
          if (
            i === -1 ||
            (i === -2 && oldNavigationPage.messageListener === undefined)
          ) {
            return oldNavigationPage;
          }
          const targetPageButton = (() => {
            let currentNavButtonIndex = 0;
            for (const row of oldNavigationPage.navigationButtons ?? []) {
              for (const button of row) {
                if (currentNavButtonIndex === i) {
                  return button;
                }
                currentNavButtonIndex += 1;
              }
            }
            return undefined;
          })();
          const newMessage = await (async () => {
            if (i === -2 && currentRootMessage.replyPayload !== undefined) {
              const {appUserId, text} = currentRootMessage.replyPayload; // it's hacky, redo it later
              return oldNavigationPage.messageListener!.generateMessage(
                appUserId,
                text
              ).resultValue;
            }
            if (targetPageButton === undefined) {
              return undefined;
            }
            return targetPageButton.generateMessage().resultValue;
          })();
          if (newMessage === undefined) {
            console.warn(`Could not find navigation button for i=${i}`);
            return undefined;
          }
          currentRootMessage = newMessage;
          if (newMessage.navigation === undefined) {
            if (
              [newMessage.text, newMessage.attachment, newMessage.buttons].find(
                x => x !== undefined
              ) === undefined
            ) {
              console.warn(
                'No text/attachment/buttons were detected on new message'
              );
              return undefined;
            }
            // we got non-navigation message, so we convert it
            return {
              currentContent: {
                text: newMessage.text,
                attachment: newMessage.attachment,
                buttons: newMessage.buttons,
              },
            };
          }
          return newMessage.navigation;
        })();
        if (targetPage === undefined) {
          return undefined;
        }
        const targetContent = targetPage.currentContent;
        const text = targetContent?.text ?? '';
        const attachment = targetContent?.attachment;
        const buttons = targetContent?.buttons ?? [];
        const keyboard = Keyboard.builder().inline(true);
        // Add content-related buttons
        for (const row of buttons) {
          for (const button of row) {
            keyboard.textButton({
              label:
                button.text.length > 40
                  ? button.text.substring(0, 37) + '...'
                  : button.text,
              payload: {
                target: APP_CODE_NAME,
                command: button.command,
              },
            });
          }
          keyboard.row();
        }
        // Add navigation-related buttons if needed
        const targetNavButtons = targetPage.navigationButtons ?? [];
        if (navigationEnabled && targetNavButtons.length !== 0) {
          let currentNavButtonIndex = 0;
          for (const row of targetNavButtons) {
            for (const button of row) {
              keyboard.callbackButton({
                color: ButtonColor.PRIMARY,
                label:
                  button.text.length > 40
                    ? button.text.substring(0, 37) + '...'
                    : button.text,
                payload: {
                  target: APP_CODE_NAME,
                  navigate: {
                    messageKey: messageKey,
                    targetIndex: currentNavButtonIndex++,
                  },
                } as VkNavigationButtonPayload,
              });
            }
            keyboard.row();
          }
        }
        const maybeOwner =
          userInfo !== undefined &&
          navigationEnabled &&
          targetNavButtons.length !== 0 &&
          ctx.peerId !== ctx.senderId &&
          targetPage.enabledCaptions?.includes(
            VkNavigationCaption.NAVIGATION_OWNER
          )
            ? `Меню управляет: ${userFullName}\n\n`
            : '';
        const maybeListening =
          targetPage.enabledCaptions?.includes(
            VkNavigationCaption.NAVIGATION_LISTENING
          ) && targetPage.messageListener !== undefined
            ? 'Бот ожидает вашего сообщения...\n\n'
            : '';
        return {
          text: maybeOwner + maybeListening + text,
          attachment: attachment,
          keyboard: keyboard,
          enabledCaptions: targetPage.enabledCaptions,
        };
      } catch (e) {
        console.error('Could not generate new navigation page');
        console.error(e);
        return undefined;
      }
    };
    const messageKey = randomUUID();
    let firstKeyboard: KeyboardBuilder | undefined;
    const botMessageCtx = await (async () => {
      const firstMessage = await trySetNewRoot(-1, true, messageKey);
      if (firstMessage === undefined) {
        throw Error('Could not create first page of the message');
      }
      const text = firstMessage.text ?? '';
      const attachment = firstMessage.attachment;
      const keyboard = firstMessage.keyboard;
      firstKeyboard = keyboard;
      if (replyMessagePromise !== undefined) {
        const botMessage = await replyMessagePromise;
        await botMessage.editMessage({
          message: text,
          attachment,
          keyboard,
        });
        return botMessage;
      } else {
        return await ctx.reply(text, {attachment, keyboard});
      }
    })();
    this.navigationMessages[messageKey] = {
      creationTime: Date.now(),
      ownerId: ctx.senderId,
      peerId: ctx.peerId,
      extraContext: {
        userFullName: userFullName,
        output: outputMessage,
        currentKeyboard: firstKeyboard,
        ctx: botMessageCtx,
      },
      goTo: async index => {
        const targetMessage = await trySetNewRoot(index, true, messageKey);
        if (targetMessage === undefined) {
          await botMessageCtx.editMessage({
            message: 'Произошла ошибка во время выполнения команды',
          });
          delete this.navigationMessages[messageKey];
          return;
        }
        const text = targetMessage.text ?? '';
        const attachment = targetMessage.attachment;
        const keyboard = targetMessage.keyboard;
        await botMessageCtx.editMessage({message: text, attachment, keyboard});
        // still in use, update time:
        this.navigationMessages[messageKey].creationTime = Date.now();
        this.navigationMessages[messageKey].extraContext = {
          userFullName: userFullName,
          output: currentRootMessage,
          currentKeyboard: keyboard,
          ctx: botMessageCtx,
        };
        const rootNav = currentRootMessage.navigation;
        if (
          (rootNav?.navigationButtons?.length ?? 0) === 0 &&
          rootNav?.messageListener === undefined
        ) {
          // user can't navigate anymore
          delete this.navigationMessages[messageKey];
        }
      },
      onExpire: async reason => {
        const targetMessage = await trySetNewRoot(-1, false, messageKey);
        if (targetMessage === undefined) {
          await botMessageCtx.editMessage({
            message: 'Произошла ошибка во время завершения работы меню',
          });
          return;
        }
        const text = targetMessage.text ?? '';
        const attachment = targetMessage.attachment;
        const keyboard = targetMessage.keyboard;
        const reasonText = (() => {
          switch (reason) {
            case 'botStopped':
              return 'плановая перезагрузка бота';
            case 'timeUp':
              return 'время бездействия превышено';
            case 'limitReached':
              return 'количество меню в чате превышено';
          }
        })();
        const maybeCaption = (() => {
          if (
            targetMessage.enabledCaptions?.includes(
              VkNavigationCaption.NAVIGATION_EXPIRE
            )
          ) {
            return `Меню больше недействительно: ${reasonText}\n\n`;
          }
          return '';
        })();
        await botMessageCtx.editMessage({
          message: `${maybeCaption}${text}`,
          attachment,
          keyboard,
        });
        delete this.navigationMessages[messageKey];
      },
    };
  }

  async handleNavigationByReply(ctx: VkMessageContext): Promise<boolean> {
    if (!ctx.text) {
      return false;
    }
    for (const key in this.navigationMessages) {
      const navMessageInfo = this.navigationMessages[key];
      if (navMessageInfo.peerId !== ctx.peerId) {
        continue;
      }
      const navigation = navMessageInfo.extraContext.output.navigation;
      if (navigation === undefined) {
        return false;
      }
      const messageListener = navigation.messageListener;
      if (messageListener === undefined) {
        continue;
      }
      const senderInfo: ReplySenderInfo = {
        appUserId: VkIdConverter.vkUserIdToAppUserId(ctx.senderId),
        isDialogInitiator: navMessageInfo.ownerId === ctx.senderId,
      };
      const testResult = messageListener.test(ctx.text, senderInfo);
      if (testResult === undefined) {
        continue;
      }
      console.log('Detected valid reply to navigation message');
      const keyboard = navMessageInfo.extraContext.currentKeyboard;
      const attachment = navMessageInfo.extraContext.output.attachment;
      if (testResult === 'edit') {
        if (messageListener.getEdit === undefined) {
          return false;
        }
        console.log(`Editing message ${key}...`);
        const edit = messageListener.getEdit(ctx.text, senderInfo);
        const maybeOwner =
          navigation.enabledCaptions?.includes(
            VkNavigationCaption.NAVIGATION_OWNER
          ) && navMessageInfo.extraContext.userFullName !== undefined
            ? `Меню управляет: ${navMessageInfo.extraContext.userFullName}\n\n`
            : '';
        const maybeListening = navigation.enabledCaptions?.includes(
          VkNavigationCaption.NAVIGATION_LISTENING
        )
          ? 'Бот ожидает вашего сообщения...\n\n'
          : '';
        await navMessageInfo.extraContext.ctx.editMessage({
          message: maybeOwner + maybeListening + edit,
          attachment,
          keyboard,
        });
        return true;
      }
      if (testResult === 'match') {
        console.log(`Generating new message for ${key}...`);
        navMessageInfo.extraContext.output.replyPayload = {
          appUserId: senderInfo.appUserId,
          text: ctx.text,
        };
        await navMessageInfo.goTo(-2);
        return true;
      }
    }
    return false;
  }
}

type VkPaginationButtonPayload = {
  target: typeof APP_CODE_NAME;
  switchPage: {
    messageKey: string;
    targetIndex: number;
  };
};

function isVkPaginationPayload(
  payload: unknown
): payload is VkPaginationButtonPayload {
  if (typeof payload !== 'object') {
    return false;
  }
  const paginationPayload = payload as Partial<VkPaginationButtonPayload>;
  if (paginationPayload.target !== APP_CODE_NAME) {
    return false;
  }
  if (paginationPayload.switchPage === undefined) {
    return false;
  }
  if (
    typeof paginationPayload.switchPage?.messageKey !== 'string' ||
    typeof paginationPayload.switchPage?.targetIndex !== 'number'
  ) {
    return false;
  }
  return true;
}

type VkNavigationButtonPayload = {
  target: typeof APP_CODE_NAME;
  navigate: {
    messageKey: string;
    targetIndex: number;
  };
};

function isVkNavigationPayload(
  payload: unknown
): payload is VkNavigationButtonPayload {
  if (typeof payload !== 'object') {
    return false;
  }
  const navPayload = payload as Partial<VkNavigationButtonPayload>;
  if (navPayload.target !== APP_CODE_NAME) {
    return false;
  }
  if (navPayload.navigate === undefined) {
    return false;
  }
  if (
    typeof navPayload.navigate?.messageKey !== 'string' ||
    typeof navPayload.navigate?.targetIndex !== 'number'
  ) {
    return false;
  }
  return true;
}

type BestCommandMatch = {
  matchResult: CommandMatchResult<UnknownExecutionParams>;
  command: TextCommand<
    UnknownExecutionParams,
    UnknownViewParams,
    VkMessageContext,
    VkOutputMessage
  >;
  ctx: VkMessageContext;
};

type NavigationCleanupReason = 'timeUp' | 'limitReached' | 'botStopped';

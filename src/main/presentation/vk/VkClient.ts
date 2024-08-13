import {randomUUID} from 'crypto';
import {Keyboard, KeyboardBuilder, VK} from 'vk-io';
import {APP_CODE_NAME} from '../../App';
import {CalculationType} from '../../primitives/MaybeDeferred';
import {Timespan} from '../../primitives/Timespan';
import {TextCommand} from '../commands/base/TextCommand';
import {VkMessageContext} from './VkMessageContext';
import {VkOutputMessage, VkOutputMessageButton} from './VkOutputMessage';

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
          paginatedMessage.goTo(targetIndex);
        } else {
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

    console.log('VK client started!');
  }

  async stop(): Promise<void> {
    console.log('VK client stopping...');

    await this.vk.updates.stop();
    console.log('VK updates stopped');

    this.stopPaginationCleanups();
    console.log('Pagination cleanups stopped');

    const paginatedMessagesCount = Object.values(this.paginatedMessages).length;
    if (paginatedMessagesCount > 0) {
      this.cleanUpPaginatedMessages(0);
      const cleanUpCount =
        paginatedMessagesCount - Object.values(this.paginatedMessages).length;
      console.log(
        `Successfull pagination cleanup count: ${cleanUpCount}/${paginatedMessagesCount}`
      );
    }

    console.log('VK client stopped!');
  }

  private async process(ctx: VkMessageContext): Promise<void> {
    const allLayouts = [this.kbLayouts.en, this.kbLayouts.ru];
    for (const layout of allLayouts) {
      const ctxCopy = Object.assign({}, ctx);
      Object.setPrototypeOf(ctxCopy, Object.getPrototypeOf(ctx));
      const commandExecuted = await this.processWithKbLayout(layout, ctxCopy);
      if (commandExecuted) {
        break;
      }
    }
  }

  private async processWithKbLayout(
    layout: readonly string[],
    ctx: VkMessageContext
  ): Promise<boolean> {
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
        return false;
      }
    }
    for (const preproces of this.preprocessors) {
      ctx = await preproces(ctx);
    }
    let commandExecuted = false;
    for (const command of this.publicCommands) {
      commandExecuted ||= await this.tryExecuteCommand(command, ctx);
    }
    if (this.adminIds.includes(ctx.senderId)) {
      for (const command of this.adminCommands) {
        commandExecuted ||= await this.tryExecuteCommand(command, ctx);
      }
    }
    return commandExecuted;
  }

  private async tryExecuteCommand(
    command: TextCommand<
      UnknownExecutionParams,
      UnknownViewParams,
      VkMessageContext,
      VkOutputMessage
    >,
    ctx: VkMessageContext
  ): Promise<boolean> {
    const matchResult = command.matchMessage(ctx);
    if (!matchResult.isMatch) {
      return false;
    }
    let replyMessagePromise: Promise<VkMessageContext> | undefined = undefined;
    const isLongCalculation = (type: CalculationType): boolean => {
      return type >= CalculationType.RemoteNetworkCalls;
    };
    const executionArgs = matchResult.commandArgs!;
    console.log(
      `Trying to execute command ${
        command.internalName
      } (args=${JSON.stringify(executionArgs)})`
    );
    try {
      const processingWork = command.process(executionArgs, ctx);
      if (isLongCalculation(processingWork.calculationType)) {
        replyMessagePromise = ctx.reply('Команда выполняется...');
      }
      const viewParams = await processingWork.resultValue;
      const outputCreationWork = command.createOutputMessage(viewParams);
      if (isLongCalculation(outputCreationWork.calculationType)) {
        if (replyMessagePromise === undefined) {
          replyMessagePromise = ctx.reply('Команда выполняется...');
        }
      }
      const outputMessage = await outputCreationWork.resultValue;
      if (outputMessage.pagination !== undefined) {
        await this.replyWithPagination(ctx, replyMessagePromise, outputMessage);
        return true;
      }
      if (!outputMessage.text && !outputMessage.attachment) {
        if (replyMessagePromise !== undefined) {
          const botMessage = await replyMessagePromise;
          await botMessage.editMessage({message: 'Команда выполнена'});
        } else {
          ctx.reply('Команда выполнена');
        }
        return true;
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
    return true;
  }

  private createKeyboard(
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

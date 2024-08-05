import {Keyboard, KeyboardBuilder, VK} from 'vk-io';
import {APP_CODE_NAME} from '../../App';
import {CalculationType} from '../../primitives/MaybeDeferred';
import {TextCommand} from '../commands/base/TextCommand';
import {VkMessageContext} from './VkMessageContext';
import {VkOutputMessage, VkOutputMessageButton} from './VkOutputMessage';

type UnknownExecutionParams = unknown;
type UnknownViewParams = unknown;

export class VkClient {
  readonly vk: VK;
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

  constructor(vk: VK, adminIds: number[]) {
    this.vk = vk;
    this.adminIds = adminIds;
    this.vk.updates.on('message', ctx => this.process(ctx));
  }

  async start(): Promise<void> {
    console.log('VK client starting...');

    const initPromises = this.initActions.map(x => x());
    await Promise.all(initPromises);
    console.log('VK client initialized successfully');

    await this.vk.updates.start();
    console.log('VK updates started');

    console.log('VK client started!');
  }

  async stop(): Promise<void> {
    console.log('VK client stopping...');
    await this.vk.updates.stop();
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
      if (!outputMessage.text && !outputMessage.attachment) {
        return true;
      }
      const text = outputMessage.text || '';
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
}

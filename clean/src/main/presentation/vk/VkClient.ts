import {VK, Keyboard, KeyboardBuilder} from 'vk-io';
import {VkCommand} from './commands/base/VkCommand';
import {VkMessageContext} from './VkMessageContext';
import {VkOutputMessageButton} from './commands/base/VkOutputMessage';
import {APP_CODE_NAME} from '../../App';

type UnknownExecutionParams = unknown;
type UnknownViewParams = unknown;

export class VkClient {
  readonly vk: VK;
  readonly commands: VkCommand<UnknownExecutionParams, UnknownViewParams>[] =
    [];
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

  constructor(vk: VK) {
    this.vk = vk;
    this.vk.updates.on('message', ctx => this.process(ctx));
  }

  addCommand(command: VkCommand<UnknownExecutionParams, UnknownViewParams>) {
    this.commands.push(command);
  }

  addCommands(
    commands: VkCommand<UnknownExecutionParams, UnknownViewParams>[]
  ): void {
    for (const command of commands) {
      this.addCommand(command);
    }
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
    for (const command of this.commands) {
      commandExecuted ||= await this.tryExecuteCommand(command, ctx);
    }
    return commandExecuted;
  }

  private async tryExecuteCommand(
    command: VkCommand<UnknownExecutionParams, UnknownViewParams>,
    ctx: VkMessageContext
  ): Promise<boolean> {
    const matchResult = command.matchVkMessage(ctx);
    if (!matchResult.isMatch) {
      return false;
    }
    const executionArgs = matchResult.commandArgs!;
    console.log(
      `Trying to execute command ${
        command.internalName
      } (args=${JSON.stringify(executionArgs)})`
    );
    try {
      const viewParams = await command.process(executionArgs);
      const outputMessage = command.createOutputMessage(viewParams);
      if (!outputMessage.text && !outputMessage.attachment) {
        return true;
      }
      const text = outputMessage.text || '';
      const attachment = outputMessage.attachment;
      const buttons = outputMessage.buttons;
      const keyboard = buttons && this.createKeyboard(buttons);
      await ctx.reply(text, {attachment, keyboard});
    } catch (e) {
      console.error(e);
      await ctx.reply('Произошла ошибка при выполнении команды');
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
          label: button.text,
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

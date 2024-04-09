import {MessageContext, ContextDefaultState, VK} from 'vk-io';
import {CommandMatchResult} from './CommandMatchResult';
import {BotDb} from '../database/BotDb';
import {IOsuServerApi} from '../../api/IOsuServerApi';
import {catchedValueToError} from '../../primitives/Errors';
export abstract class BotCommand<TExecParams> {
  private _isAvailable: Boolean;

  /** Dev name of command */
  abstract readonly name: string;

  /** Command name for display */
  abstract readonly title: string;

  /** Command description for display */
  abstract readonly description: string;

  /** Instructions on usage */
  abstract readonly usage: string;

  db: BotDb;
  api: IOsuServerApi;
  vk: VK;
  adminVkId: number;

  constructor(db: BotDb, api: IOsuServerApi, vk: VK, adminVkId: number) {
    this.db = db;
    this.api = api;
    this.vk = vk;
    this.adminVkId = adminVkId;
    this._isAvailable = false;
  }

  init() {
    console.log(`Initializing command ${this.name}...`);
    this._isAvailable = this.isAvailable();
    let maybeAvailable: string;
    if (this._isAvailable) {
      maybeAvailable = 'is available';
    } else {
      maybeAvailable = 'is not available';
    }
    console.log(`Command ${this.name} initialized and ${maybeAvailable}`);
  }

  async process(
    ctx: MessageContext<ContextDefaultState> & object
  ): Promise<void> {
    if (!ctx.hasText && !ctx.hasMessagePayload) {
      return;
    }
    const text = ctx.text?.toLowerCase();
    if (!ctx.hasMessagePayload && text && !text.startsWith('l ')) {
      return; // TODO: extract prefix into some server command list logic
    }
    const matchResult = this.matchMessage(ctx);
    if (!matchResult.isMatch) {
      return;
    }
    if (!this._isAvailable) {
      ctx.reply('Команда недоступна!');
      return;
    }
    try {
      const params = matchResult.executionParams!;
      console.log(
        `Trying to execute command ${this.name} (${JSON.stringify(params)})`
      );
      await this.execute(params, ctx);
    } catch (e) {
      console.log(e);
      const internalError = catchedValueToError(e);
      const fallbackError = Error(
        'Error has occured that did not match any known error type'
      );
      const finalError = internalError || fallbackError;
      ctx.reply(
        `Произошла ошибка при выполнении команды\n${finalError.message}`
      );
      return;
    }
  }

  abstract isAvailable(): Boolean;

  abstract matchMessage(
    ctx: MessageContext<ContextDefaultState> & object
  ): CommandMatchResult<TExecParams>;

  abstract execute(
    params: TExecParams,
    ctx: MessageContext<ContextDefaultState> & object
  ): Promise<void>;

  /**
   * Gets command text from either payload (preferred) or message text.
   * If there is no text and no payload, throws an error.
   */
  protected getCommandFromPayloadOrText(
    ctx: MessageContext<ContextDefaultState> & object
  ): string {
    if (!ctx.hasMessagePayload && !ctx.hasText) {
      throw Error('Message context has no payload and no text');
    }
    const command: string | undefined = ctx.hasMessagePayload
      ? ctx.messagePayload!.command
      : undefined;
    const commandText = command || ctx.text!;
    return commandText;
  }

  protected hasMapLink(text: string): boolean {
    const regexes = [
      /https?:\/\/osu\.ppy\.sh\/b\/(?<ID>\d+)/gi,
      /(https?:\/\/)?osu\.ppy\.sh\/beatmaps\/(?<ID>\d+)/gi,
      /(https?:\/\/)?osu\.ppy\.sh\/beatmapsets\/(\d+)#(osu|taiko|fruits|mania)+\/(?<ID>\d+)/gi,
    ];
    for (const regex of regexes) {
      const matches = [...text.matchAll(regex)];
      if (matches.length > 0) {
        return true;
      }
    }
    return false;
  }

  protected getSingleBeatmapIdFromPayloadOrText(
    ctx: MessageContext<ContextDefaultState> & object
  ): number | undefined {
    const commandText = this.getCommandFromPayloadOrText(ctx);
    const regexes = [
      /https?:\/\/osu\.ppy\.sh\/b\/(?<ID>\d+)/gi,
      /(https?:\/\/)?osu\.ppy\.sh\/beatmaps\/(?<ID>\d+)/gi,
      /(https?:\/\/)?osu\.ppy\.sh\/beatmapsets\/(\d+)#(osu|taiko|fruits|mania)+\/(?<ID>\d+)/gi,
    ];
    const getSingleIdFromString = (s: string): number | undefined => {
      for (const regex of regexes) {
        const matches = [...s.matchAll(regex)];
        if (matches.length === 1) {
          return Number(matches[0].groups!.ID);
        }
      }
      return undefined;
    };

    const idFromCommand = getSingleIdFromString(commandText);
    if (idFromCommand) {
      return idFromCommand;
    }

    if (ctx.hasAttachments('link')) {
      const url = ctx.getAttachments('link')[0].url;
      const idFromlink = getSingleIdFromString(url);
      if (idFromlink) {
        return idFromlink;
      }
    }

    if (ctx.hasReplyMessage) {
      const replyMsg = ctx.replyMessage!;
      return this.getSingleBeatmapIdFromPayloadOrText(replyMsg);
    }

    return undefined;
  }
}

import {MessageContext, ContextDefaultState, VK} from 'vk-io';
import {CommandMatchResult} from './CommandMatchResult';
import {BotDb} from '../database/BotDb';
import {IOsuServerApi} from '../../api/IOsuServerApi';
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

  constructor(db: BotDb, api: IOsuServerApi, vk: VK) {
    this.db = db;
    this.api = api;
    this.vk = vk;
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
    const text = ctx.text;
    if (text && !text.startsWith('l ')) {
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
    this.execute(matchResult.executionParams!, ctx);
  }

  abstract isAvailable(): Boolean;

  abstract matchMessage(
    ctx: MessageContext<ContextDefaultState> & object
  ): CommandMatchResult<TExecParams>;

  abstract execute(
    params: TExecParams,
    ctx: MessageContext<ContextDefaultState> & object
  ): void;
}

import {MessageContext, ContextDefaultState} from 'vk-io';
import {App} from '../../App';
import {CommandMatchResult} from './CommandMatchResult';
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

  app: App;

  constructor(app: App) {
    this.app = app;
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
    if (!this._isAvailable) {
      return;
    }
    const matchResult = this.matchMessage(ctx);
    if (!matchResult.isMatch) {
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

import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from './base/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {GetRecentPlaysUseCase} from '../../../domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {OsuServer} from '../../../../primitives/OsuServer';

export class UserRecentPlays extends VkCommand<
  UserRecentPlaysExecutionParams,
  UserRecentPlaysViewParams
> {
  getRecentPlays: GetRecentPlaysUseCase;

  constructor(getRecentPlays: GetRecentPlaysUseCase) {
    super();
    this.getRecentPlays = getRecentPlays;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserRecentPlaysExecutionParams> {
    const fail = CommandMatchResult.fail<UserRecentPlaysExecutionParams>();
    if (!ctx.hasText) {
      return fail;
    }
    const text = ctx.text!;
    if (!text.startsWith('test')) {
      return fail;
    }
    return fail;
  }

  async process(
    params: UserRecentPlaysExecutionParams
  ): Promise<UserRecentPlaysViewParams> {
    const recentPlays = await this.getRecentPlays.execute({
      server: params.server,
      username: 'Someone good',
      includeFails: true,
      offset: 0,
      quantity: 1,
    });
    return {
      server: recentPlays.server,
      username: params.username.split('').reverse().join(''),
      scores: ['foo'],
    };
  }

  createOutputMessage(params: UserRecentPlaysViewParams): VkOutputMessage {
    const server = params.server;
    const username = params.username;
    const scores = params.scores;
    return {
      text: `Server: ${OsuServer[server]}, scores: ${scores}, username: ${username}`,
      attachment: undefined,
      buttons: [[{text: 'Я тестовая кнопка', command: 'test FOOBAR 123'}]],
    };
  }
}

interface UserRecentPlaysExecutionParams {
  server: OsuServer;
  username: string;
}

interface UserRecentPlaysViewParams {
  server: OsuServer;
  username: string;
  scores: string[];
}

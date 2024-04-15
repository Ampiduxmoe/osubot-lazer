import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from './base/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {GetRecentPlaysUseCase} from '../../../domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {RecentPlayServer} from '../../../domain/usecases/get_recent_plays/BoundaryTypes';

export class UserRecentPlays extends VkCommand<
  UserRecentExecutionParams,
  UserRecentPlaysViewParams
> {
  getRecentPlays: GetRecentPlaysUseCase;

  constructor(getRecentPlays: GetRecentPlaysUseCase) {
    super();
    this.getRecentPlays = getRecentPlays;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserRecentExecutionParams> {
    const fail = CommandMatchResult.fail<UserRecentExecutionParams>();
    if (!ctx.hasText) {
      return fail;
    }
    const text = ctx.text!;
    if (!text.startsWith('test')) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: RecentPlayServer.Bancho,
      username: String(text.split(' ')[1]),
    });
  }

  createViewParams(
    params: UserRecentExecutionParams
  ): UserRecentPlaysViewParams {
    const recentPlays = this.getRecentPlays.execute({
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
      text: `Server: ${server}, scores: ${scores}, username: ${username}`,
      attachment: undefined,
      buttons: [[{text: 'Я тестовая кнопка', command: 'test FOOBAR 123'}]],
    };
  }
}

interface UserRecentExecutionParams {
  server: RecentPlayServer;
  username: string;
}

interface UserRecentPlaysViewParams {
  server: RecentPlayServer;
  username: string;
  scores: string[];
}

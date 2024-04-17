import {UseCase} from '../UseCase';
import {GetRecentPlaysRequest} from './GetRecentPlaysRequest';
import {GetRecentPlaysResponse} from './GetRecentPlaysResponse';

export class GetRecentPlaysUseCase
  implements UseCase<GetRecentPlaysRequest, GetRecentPlaysResponse>
{
  async execute(
    params: GetRecentPlaysRequest
  ): Promise<GetRecentPlaysResponse> {
    return {
      server: params.server,
      user: 'TestUser',
      scores: ['Score1, Score2'],
    };
  }
}

import {ReplayParser} from '../../replay_processing/ReplayParser';
import {UseCase} from '../UseCase';
import {ParseReplayRequest} from './ParseReplayRequest';
import {ParseReplayResponse} from './ParseReplayResponse';

export class ParseReplayUseCase
  implements UseCase<ParseReplayRequest, ParseReplayResponse>
{
  constructor() {}

  async execute(params: ParseReplayRequest): Promise<ParseReplayResponse> {
    return {
      isFailure: false,
      replay: new ReplayParser(params.data).getReplayData(),
    };
  }
}

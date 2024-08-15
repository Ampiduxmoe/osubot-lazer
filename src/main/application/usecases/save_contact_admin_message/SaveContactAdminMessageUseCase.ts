import {UnreadMessagesDao} from '../../requirements/dao/UnreadMessagesDao';
import {UseCase} from '../UseCase';
import {SaveContactAdminMessageRequest} from './SaveContactAdminMessageRequest';
import {SaveContactAdminMessageResponse} from './SaveContactAdminMessageResponse';

export class SaveContactAdminMessageUseCase
  implements
    UseCase<SaveContactAdminMessageRequest, SaveContactAdminMessageResponse>
{
  constructor(protected unreadMessages: UnreadMessagesDao) {}

  async execute(
    params: SaveContactAdminMessageRequest
  ): Promise<SaveContactAdminMessageResponse> {
    return {
      success: await this.unreadMessages.saveIfDoesNotExist(
        params.appUserId,
        params.messageId,
        params.text
      ),
    };
  }
}

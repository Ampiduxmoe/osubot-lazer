import {UnreadMessagesDao} from '../../requirements/dao/UnreadMessagesDao';
import {UseCase} from '../UseCase';
import {SaveContactAdminMessageRequest} from './SaveContactAdminMessageRequest';
import {SaveContactAdminMessageResponse} from './SaveContactAdminMessageResponse';

export class SaveContactAdminMessageUseCase
  implements
    UseCase<SaveContactAdminMessageRequest, SaveContactAdminMessageResponse>
{
  unreadMessages: UnreadMessagesDao;
  constructor(unreadMessages: UnreadMessagesDao) {
    this.unreadMessages = unreadMessages;
  }

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

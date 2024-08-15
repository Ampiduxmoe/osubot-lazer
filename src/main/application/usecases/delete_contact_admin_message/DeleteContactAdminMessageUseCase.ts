import {UnreadMessagesDao} from '../../requirements/dao/UnreadMessagesDao';
import {UseCase} from '../UseCase';
import {DeleteContactAdminMessageRequest} from './DeleteContactAdminMessageRequest';
import {DeleteContactAdminMessageResponse} from './DeleteContactAdminMessageResponse';

export class DeleteContactAdminMessageUseCase
  implements
    UseCase<
      DeleteContactAdminMessageRequest,
      DeleteContactAdminMessageResponse
    >
{
  constructor(protected unreadMessages: UnreadMessagesDao) {}

  async execute(
    params: DeleteContactAdminMessageRequest
  ): Promise<DeleteContactAdminMessageResponse> {
    await this.unreadMessages.delete(params.appUserId);
    return {};
  }
}

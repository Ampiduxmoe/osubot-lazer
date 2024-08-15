import {UnreadMessagesDao} from '../../requirements/dao/UnreadMessagesDao';
import {UseCase} from '../UseCase';
import {GetContactAdminMessageRequest} from './GetContactAdminMessageRequest';
import {GetContactAdminMessageResponse} from './GetContactAdminMessageResponse';

export class GetContactAdminMessageUseCase
  implements
    UseCase<GetContactAdminMessageRequest, GetContactAdminMessageResponse>
{
  constructor(protected unreadMessages: UnreadMessagesDao) {}

  async execute(
    params: GetContactAdminMessageRequest
  ): Promise<GetContactAdminMessageResponse> {
    const message = await this.unreadMessages.get(params.appUserId);
    return {messageInfo: message};
  }
}

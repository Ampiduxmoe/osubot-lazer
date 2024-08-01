import {
  UnreadMessageInfo,
  UnreadMessagesDao,
} from '../../application/requirements/dao/UnreadMessagesDao';
import {UnreadMessagesRepository} from '../repository/repositories/UnreadMessagesRepository';

export class UnreadMessagesDaoImpl implements UnreadMessagesDao {
  private unreadMessagesRepository: UnreadMessagesRepository;
  constructor(unreadMessagesRepository: UnreadMessagesRepository) {
    this.unreadMessagesRepository = unreadMessagesRepository;
  }
  async get(appUserId: string): Promise<UnreadMessageInfo | undefined> {
    return await this.unreadMessagesRepository.get({appUserId: appUserId});
  }
  async saveIfDoesNotExist(
    appUserId: string,
    messageId: string,
    text: string
  ): Promise<boolean> {
    const lastMessage = await this.unreadMessagesRepository.get({
      appUserId: appUserId,
    });
    if (lastMessage !== undefined) {
      return false;
    }
    await this.unreadMessagesRepository.add({
      appUserId: appUserId,
      messageId: messageId,
      text: text,
    });
    return true;
  }
}

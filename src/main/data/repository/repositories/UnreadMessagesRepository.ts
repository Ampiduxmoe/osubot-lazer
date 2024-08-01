import {Repository} from '../Repository';
import {UnreadMessage, UnreadMessageKey} from '../models/UnreadMessage';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnreadMessagesRepository
  extends Repository<UnreadMessageKey, UnreadMessage> {}

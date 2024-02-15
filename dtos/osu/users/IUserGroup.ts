import {IGroup} from './IGroup';

export interface IUserGroup extends IGroup {
  playmodes: string[] | null;
}

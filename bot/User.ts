import {IUserExtended} from '../dtos/osu/users/IUserExtended';
export class User {
  vkId: number;
  osuId: number;
  username: string;

  constructor(vkId: number, rawUser: IUserExtended) {
    this.vkId = vkId;
    this.osuId = rawUser.id;
    this.username = rawUser.username;
  }
}

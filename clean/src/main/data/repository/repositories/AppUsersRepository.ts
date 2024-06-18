import {Repository} from '../Repository';
import {AppUser, AppUserKey} from '../models/AppUser';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppUsersRepository extends Repository<AppUserKey, AppUser> {}

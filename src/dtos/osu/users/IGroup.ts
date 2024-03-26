import {IDescription} from '../misc/IDescription';

export interface IGroup {
  colour: string | null;
  has_listing: boolean;
  has_playmodes: boolean;
  id: number;
  identifier: string;
  is_probationary: boolean;
  name: string;
  short_name: string;
  description?: IDescription;
}

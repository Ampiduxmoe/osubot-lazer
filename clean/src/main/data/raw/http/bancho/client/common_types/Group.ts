import {Description} from './Description';

// references:
// https://osu.ppy.sh/docs/index.html#group
export interface Group {
  colour: string | null;
  has_listing: boolean;
  has_playmodes: boolean;
  id: number;
  identifier: string;
  is_probationary: boolean;
  name: string;
  short_name: string;
  description?: Description;
}

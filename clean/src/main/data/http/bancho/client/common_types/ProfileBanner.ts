// references:
// https://osu.ppy.sh/docs/index.html#user-profilebanner
export type ProfileBanner = {
  id: number;
  tournament_id: number;
  image: string | null;
  'image@2x': string | null;
};

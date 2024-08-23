export enum OsuServer {
  Bancho,
}

// https://stackoverflow.com/a/48768775
export const ALL_OSU_SERVER_KEYS = Object.keys(OsuServer).filter(x => {
  return isNaN(Number(x));
}) as (keyof typeof OsuServer)[];

export const ALL_OSU_SERVER_VALUES = ALL_OSU_SERVER_KEYS.map(
  key => OsuServer[key]
);

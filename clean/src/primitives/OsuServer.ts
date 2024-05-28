export enum OsuServer {
  Bancho,
}

// https://stackoverflow.com/a/48768775
export const ALL_OSU_SERVERS = Object.keys(OsuServer).filter(x => {
  return isNaN(Number(x));
}) as (keyof typeof OsuServer)[];

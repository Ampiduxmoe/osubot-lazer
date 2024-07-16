export enum OsuRuleset {
  osu,
  taiko,
  ctb,
  mania,
}

// https://stackoverflow.com/a/48768775
export const ALL_OSU_RULESETS = Object.keys(OsuRuleset).filter(x => {
  return isNaN(Number(x));
}) as (keyof typeof OsuRuleset)[];

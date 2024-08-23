export enum OsuRuleset {
  osu,
  taiko,
  ctb,
  mania,
}

// https://stackoverflow.com/a/48768775
export const ALL_OSU_RULESET_KEYS = Object.keys(OsuRuleset).filter(x => {
  return isNaN(Number(x));
}) as (keyof typeof OsuRuleset)[];

export const ALL_OSU_RULESET_VALUES = ALL_OSU_RULESET_KEYS.map(
  key => OsuRuleset[key]
);

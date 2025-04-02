export enum OsuPlayGrade {
  F,
  D,
  C,
  B,
  A,
  S,
  SS,
}

// https://stackoverflow.com/a/48768775
export const ALL_OSU_PLAY_GRADE_KEYS = Object.keys(OsuPlayGrade).filter(x => {
  return isNaN(Number(x));
}) as (keyof typeof OsuPlayGrade)[];

export const ALL_OSU_PLAY_GRADE_VALUES = ALL_OSU_PLAY_GRADE_KEYS.map(
  key => OsuPlayGrade[key]
);

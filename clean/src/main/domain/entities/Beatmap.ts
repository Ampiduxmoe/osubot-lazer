import {Beatmapset} from './Beatmapset';
import {Song} from './Song';
import {Mode} from './mode/Mode';

export class Beatmap<ModeType extends Mode> {
  readonly id: number;
  readonly mode: ModeType;
  readonly difficultyName: string;
  readonly stats: {
    readonly ar: number;
    readonly cs: number;
    readonly od: number;
    readonly hp: number;
  };
  readonly starRating: number;
  readonly length: number;
  readonly maxCombo: number;

  readonly beatmapset: Beatmapset;

  readonly song: Song;

  constructor({
    id,
    mode,
    difficultyName,
    stats,
    starRating,
    length,
    maxCombo,
    beatmapset,
    song,
  }: {
    id: number;
    mode: ModeType;
    difficultyName: string;
    stats: {
      ar: number;
      cs: number;
      od: number;
      hp: number;
    };
    starRating: number;
    length: number;
    maxCombo: number;
    beatmapset: Beatmapset;
    song: Song;
  }) {
    this.id = id;
    this.mode = mode;
    this.difficultyName = difficultyName;
    this.stats = stats;
    this.starRating = starRating;
    this.length = length;
    this.maxCombo = maxCombo;
    this.beatmapset = beatmapset;
    this.song = song;
  }

  copy({
    id,
    mode,
    difficultyName,
    stats,
    starRating,
    length,
    maxCombo,
    beatmapset,
    song,
  }: {
    id?: number;
    mode?: ModeType;
    difficultyName?: string;
    stats?: {
      ar: number;
      cs: number;
      od: number;
      hp: number;
    };
    starRating?: number;
    length?: number;
    maxCombo?: number | null;
    beatmapset?: Beatmapset;
    song?: Song;
  }) {
    return new Beatmap({
      id: id ?? this.id,
      mode: mode ?? this.mode,
      difficultyName: difficultyName ?? this.difficultyName,
      stats: stats ?? this.stats,
      starRating: starRating ?? this.starRating,
      length: length ?? this.length,
      maxCombo: maxCombo ?? this.maxCombo,
      beatmapset: beatmapset ?? this.beatmapset,
      song: song ?? this.song,
    });
  }
}

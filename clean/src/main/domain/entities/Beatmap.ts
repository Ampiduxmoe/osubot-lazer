import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {Beatmapset} from './Beatmapset';
import {Song} from './Song';

export class Beatmap {
  readonly id: number;
  readonly mode: OsuRuleset;
  readonly difficultyName: string;
  readonly stats: {
    readonly ar: number;
    readonly cs: number;
    readonly od: number;
    readonly hp: number;
  };
  readonly starRating: number;
  readonly length: number;
  readonly maxCombo: number | null;

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
    mode: OsuRuleset;
    difficultyName: string;
    stats: {
      ar: number;
      cs: number;
      od: number;
      hp: number;
    };
    starRating: number;
    length: number;
    maxCombo: number | null;
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
    mode?: OsuRuleset;
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
      maxCombo: maxCombo !== undefined ? maxCombo : this.maxCombo,
      beatmapset: beatmapset ?? this.beatmapset,
      song: song ?? this.song,
    });
  }
}

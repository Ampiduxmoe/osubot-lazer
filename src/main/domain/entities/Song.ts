export class Song {
  readonly artist: string;
  readonly title: string;
  readonly bpm: number;
  readonly length: number;

  constructor({
    artist,
    title,
    bpm,
    length,
  }: {
    artist: string;
    title: string;
    bpm: number;
    length: number;
  }) {
    this.artist = artist;
    this.title = title;
    this.bpm = bpm;
    this.length = length;
  }

  copy({
    artist,
    title,
    bpm,
    length,
  }: {
    artist?: string;
    title?: string;
    bpm?: number;
    length?: number;
  }) {
    return new Song({
      artist: artist ?? this.artist,
      title: title ?? this.title,
      bpm: bpm ?? this.bpm,
      length: length ?? this.length,
    });
  }
}

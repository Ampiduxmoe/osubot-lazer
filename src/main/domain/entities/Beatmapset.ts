export class Beatmapset {
  readonly id: number;
  readonly creatorId: number;
  readonly creatorUsername: string;
  readonly status: BeatmapsetStatus;

  constructor({
    id,
    creatorId,
    creatorUsername,
    status,
  }: {
    id: number;
    creatorId: number;
    creatorUsername: string;
    status: BeatmapsetStatus;
  }) {
    this.id = id;
    this.creatorId = creatorId;
    this.creatorUsername = creatorUsername;
    this.status = status;
  }

  copy({
    id,
    creatorId,
    creatorUsername,
    status,
  }: {
    id?: number;
    creatorId?: number;
    creatorUsername?: string;
    status?: BeatmapsetStatus;
  }) {
    return new Beatmapset({
      id: id ?? this.id,
      creatorId: creatorId ?? this.creatorId,
      creatorUsername: creatorUsername ?? this.creatorUsername,
      status: status ?? this.status,
    });
  }
}

export type BeatmapsetStatus =
  | 'Graveyard'
  | 'Wip'
  | 'Pending'
  | 'Ranked'
  | 'Approved'
  | 'Qualified'
  | 'Loved';

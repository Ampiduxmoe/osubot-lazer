import {Hitcounts} from './Hitcounts';

export class HitcountsCtb extends Hitcounts {
  // [great, largeTickHit, smallTickHit, smallTickMiss, miss]
  private hitcounts: number[];
  get orderedValues(): readonly number[] {
    return this.hitcounts;
  }

  get great(): number {
    return this.hitcounts[0];
  }
  set great(n: number) {
    this.hitcounts[0] = n;
  }

  get largeTickHit(): number {
    return this.hitcounts[1];
  }
  set largeTickHit(n: number) {
    this.hitcounts[1] = n;
  }

  get smallTickHit(): number {
    return this.hitcounts[2];
  }
  set smallTickHit(n: number) {
    this.hitcounts[2] = n;
  }

  get smallTickMiss(): number {
    return this.hitcounts[3];
  }
  set smallTickMiss(n: number) {
    this.hitcounts[3] = n;
  }

  get miss(): number {
    return this.hitcounts[4];
  }
  set miss(n: number) {
    this.hitcounts[4] = n;
  }

  constructor({
    great,
    largeTickHit,
    smallTickHit,
    smallTickMiss,
    miss,
  }: {
    great?: number;
    largeTickHit?: number;
    smallTickHit?: number;
    smallTickMiss?: number;
    miss?: number;
  }) {
    super();
    this.hitcounts = [
      great ?? 0,
      largeTickHit ?? 0,
      smallTickHit ?? 0,
      smallTickMiss ?? 0,
      miss ?? 0,
    ];
  }

  copy({
    great,
    largeTickHit,
    smallTickHit,
    smallTickMiss,
    miss,
  }: {
    great?: number;
    largeTickHit?: number;
    smallTickHit?: number;
    smallTickMiss?: number;
    miss?: number;
  }) {
    return new HitcountsCtb({
      great: great ?? this.great,
      largeTickHit: largeTickHit ?? this.largeTickHit,
      smallTickHit: smallTickHit ?? this.smallTickHit,
      smallTickMiss: smallTickMiss ?? this.smallTickMiss,
      miss: miss ?? this.miss,
    });
  }
}

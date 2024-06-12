import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Hitcounts} from './Hitcounts';

export class HitcountsMania extends Hitcounts {
  readonly mode = OsuRuleset.mania;

  // [perfect, great, good, ok, meh, miss]
  private hitcounts: number[];
  get orderedValues(): readonly number[] {
    return this.hitcounts;
  }

  get perfect(): number {
    return this.hitcounts[0];
  }
  set perfect(n: number) {
    this.hitcounts[0] = n;
  }

  get great(): number {
    return this.hitcounts[1];
  }
  set great(n: number) {
    this.hitcounts[1] = n;
  }

  get good(): number {
    return this.hitcounts[2];
  }
  set good(n: number) {
    this.hitcounts[2] = n;
  }

  get ok(): number {
    return this.hitcounts[3];
  }
  set ok(n: number) {
    this.hitcounts[3] = n;
  }

  get meh(): number {
    return this.hitcounts[4];
  }
  set meh(n: number) {
    this.hitcounts[4] = n;
  }

  get miss(): number {
    return this.hitcounts[5];
  }
  set miss(n: number) {
    this.hitcounts[5] = n;
  }

  constructor({
    perfect,
    great,
    good,
    ok,
    meh,
    miss,
  }: {
    perfect?: number;
    great?: number;
    good?: number;
    ok?: number;
    meh?: number;
    miss?: number;
  }) {
    super();
    this.hitcounts = [
      perfect ?? 0,
      great ?? 0,
      good ?? 0,
      ok ?? 0,
      meh ?? 0,
      miss ?? 0,
    ];
  }

  copy({
    perfect,
    great,
    good,
    ok,
    meh,
    miss,
  }: {
    perfect?: number;
    great?: number;
    good?: number;
    ok?: number;
    meh?: number;
    miss?: number;
  }) {
    return new HitcountsMania({
      perfect: perfect ?? this.perfect,
      great: great ?? this.great,
      good: good ?? this.good,
      ok: ok ?? this.ok,
      meh: meh ?? this.meh,
      miss: miss ?? this.miss,
    });
  }
}

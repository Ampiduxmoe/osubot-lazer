import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Hitcounts} from './Hitcounts';

export class HitcountsOsu extends Hitcounts {
  readonly mode = OsuRuleset.osu;

  // [great, ok, meh, miss]
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

  get ok(): number {
    return this.hitcounts[1];
  }
  set ok(n: number) {
    this.hitcounts[1] = n;
  }

  get meh(): number {
    return this.hitcounts[2];
  }
  set meh(n: number) {
    this.hitcounts[2] = n;
  }

  get miss(): number {
    return this.hitcounts[3];
  }
  set miss(n: number) {
    this.hitcounts[3] = n;
  }

  constructor({
    great,
    ok,
    meh,
    miss,
  }: {
    great?: number;
    ok?: number;
    meh?: number;
    miss?: number;
  }) {
    super();
    this.hitcounts = [great ?? 0, ok ?? 0, meh ?? 0, miss ?? 0];
  }

  copy({
    great,
    ok,
    meh,
    miss,
  }: {
    great?: number;
    ok?: number;
    meh?: number;
    miss?: number;
  }) {
    return new HitcountsOsu({
      great: great ?? this.great,
      ok: ok ?? this.ok,
      meh: meh ?? this.meh,
      miss: miss ?? this.miss,
    });
  }
}

import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {Hitcounts} from './Hitcounts';

export class HitcountsTaiko extends Hitcounts {
  readonly mode = OsuRuleset.taiko;

  // [great, ok, miss]
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

  get miss(): number {
    return this.hitcounts[2];
  }
  set miss(n: number) {
    this.hitcounts[2] = n;
  }

  constructor({great, ok, miss}: {great?: number; ok?: number; miss?: number}) {
    super();
    this.hitcounts = [great ?? 0, ok ?? 0, miss ?? 0];
  }

  copy({great, ok, miss}: {great?: number; ok?: number; miss?: number}) {
    return new HitcountsTaiko({
      great: great ?? this.great,
      ok: ok ?? this.ok,
      miss: miss ?? this.miss,
    });
  }
}

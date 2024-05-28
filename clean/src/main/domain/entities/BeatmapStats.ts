export class BeatmapStats {
  ar: number;
  cs: number;
  od: number;
  hp: number;
  constructor(ar: number, cs: number, od: number, hp: number) {
    this.ar = ar;
    this.cs = cs;
    this.od = od;
    this.hp = hp;
  }
  applyDaMod(da: DifficultyAdjustSettings) {
    this.ar = da.ar ?? this.ar;
    this.cs = da.cs ?? this.cs;
    this.od = da.od ?? this.od;
    this.hp = da.hp ?? this.hp;
  }
  applyHrMod() {
    this.ar = Math.min(this.ar * 1.4, 10);
    this.cs = Math.min(this.cs * 1.3, 10);
    this.od = Math.min(this.od * 1.4, 10);
    this.hp = Math.min(this.hp * 1.4, 10);
  }
  applyEzMod() {
    this.ar = this.ar / 2;
    this.cs = this.cs / 2;
    this.od = this.od / 2;
    this.hp = this.hp / 2;
  }
  applyTpMod() {
    this.ar = this.ar / 2;
  }
  applyDtMod(speed: number | undefined) {
    const targetSpeed = speed ?? 1.5;
    this.applySpeed(targetSpeed);
  }
  applyHtMod(speed: number | undefined) {
    const targetSpeed = speed ?? 0.75;
    this.applySpeed(targetSpeed);
  }

  applySpeed(speed: number) {
    const newApproachDuration = this.approachRateToMs(this.ar) / speed;
    this.ar = this.msToApproachRate(newApproachDuration);

    const newHitWindowMs = this.overallDifficultyToMs(this.od) / speed;
    this.od = this.msToOverallDifficulty(newHitWindowMs);
  }

  private approachRateToMs(ar: number) {
    if (ar <= 5) {
      return 1800 - ar * 120;
    } else {
      const remainder = ar - 5;
      return 1200 - remainder * 150;
    }
  }
  private msToApproachRate(ms: number) {
    if (ms >= 1200) {
      return (1800 - ms) / 120;
    } else {
      return (1200 - ms) / 150 + 5;
    }
  }
  private overallDifficultyToMs(od: number) {
    return 80 - 6 * od;
  }
  private msToOverallDifficulty(ms: number) {
    return (80 - ms) / 6;
  }
}

export interface DifficultyAdjustSettings {
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
}

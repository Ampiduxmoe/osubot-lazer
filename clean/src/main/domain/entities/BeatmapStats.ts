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
}

export interface DifficultyAdjustSettings {
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
}

export interface Mod {
  acronym: string;
  settings?: object;
}

// TODO move or remove these
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class DT implements Mod {
  acronym = 'DT';
  settings?: {
    adjust_pitch?: boolean;
    speed_change?: number;
  };
  defaultSettings = {
    adjust_pitch: false,
    speed_change: 1.5,
  };
  constructor(mod: Mod) {
    if (mod.acronym !== 'DT') {
      throw Error('Incorrect acronym');
    }
    if (mod.settings !== undefined) {
      this.settings = mod.settings;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class DA implements Mod {
  acronym = 'DA';
  settings?: {
    drain_rate?: number;
    circle_size?: number;
    approach_rate?: number;
    overall_difficulty?: number;
  };
  constructor(mod: Mod) {
    if (mod.acronym !== 'DA') {
      throw Error('Incorrect acronym');
    }
    if (mod.settings !== undefined) {
      this.settings = mod.settings;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class CL implements Mod {
  acronym = 'CL';
  settings?: {
    classic_health?: boolean;
    classic_note_lock?: boolean;
    fade_hit_circle_early?: boolean;
    always_play_tail_sample?: boolean;
    no_slider_head_accuracy?: boolean;
  };
  defaultSettings = {
    classic_health: true,
    classic_note_lock: true,
    fade_hit_circle_early: true,
    always_play_tail_sample: true,
    no_slider_head_accuracy: true,
  };
  constructor(mod: Mod) {
    if (mod.acronym !== 'CL') {
      throw Error('Incorrect acronym');
    }
    if (mod.settings !== undefined) {
      this.settings = mod.settings;
    }
  }
}

export type Mod = {
  acronym: string;
  settings?: {
    // HT, DC, DT, NC:
    speed_change?: number;
    adjust_pitch?: boolean;
    // DA:
    approach_rate?: number;
    circle_size?: number;
    drain_rate?: number;
    overall_difficulty?: number;
    // EZ:
    retries?: number;
    // TP:
    seed?: number;
    metronome?: boolean;
    // Taiko:
    scroll_speed?: number;
    // CtB:
    hard_rock_offsets?: boolean;
  };
};

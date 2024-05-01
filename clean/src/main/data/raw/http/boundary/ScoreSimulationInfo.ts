export interface ScoreSimulationInfo {
  score: {
    mods: string[];
    accuracy: number;
    combo: number;
    statistics: {
      great: number;
      ok: number;
      meh: number;
      miss: number;
    };
  };
  performanceAttributes: {
    aim: number;
    speed: number;
    accuracy: number;
    flashlight: number;
    effectiveMissCount: number;
    pp: number;
  };
  difficultyAttributes: {
    starRating: number;
    maxCombo: number;
    aimDifficulty: number;
    speedDifficulty: number;
    speedNoteCount: number;
    sliderFactor: number;
    approachRate: number;
    overallDifficulty: number;
  };
}

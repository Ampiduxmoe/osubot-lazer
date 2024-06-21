export class BeatmapStatsConversionOsu {
  static approachRateToMs(ar: number) {
    if (ar <= 5) {
      return 1800 - ar * 120;
    } else {
      const remainder = ar - 5;
      return 1200 - remainder * 150;
    }
  }
  static msToApproachRate(ms: number) {
    if (ms >= 1200) {
      return (1800 - ms) / 120;
    } else {
      return (1200 - ms) / 150 + 5;
    }
  }
  static overallDifficultyToMs(od: number) {
    return 80 - 6 * od;
  }
  static msToOverallDifficulty(ms: number) {
    return (80 - ms) / 6;
  }
}

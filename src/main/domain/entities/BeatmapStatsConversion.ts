export class BeatmapStatsConversion {
  static osu = {
    approachRateToMs(ar: number) {
      if (ar <= 5) {
        return 1800 - ar * 120;
      } else {
        const remainder = ar - 5;
        return 1200 - remainder * 150;
      }
    },
    msToApproachRate(ms: number) {
      if (ms >= 1200) {
        return (1800 - ms) / 120;
      } else {
        return (1200 - ms) / 150 + 5;
      }
    },
    overallDifficultyToMs(od: number) {
      return 80 - 6 * od;
    },
    msToOverallDifficulty(ms: number) {
      return (80 - ms) / 6;
    },
  };

  static taiko = {
    overallDifficultyToMs(od: number) {
      return 50 - 3 * od;
    },
    msToOverallDifficulty(ms: number) {
      return (50 - ms) / 3;
    },
  };
}

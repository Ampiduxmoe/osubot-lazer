import {ScoreSimulationApi} from '../../src/main/data/raw/http/ScoreSimulationApi';
import {ScoreSimulationInfo} from '../../src/main/data/raw/http/boundary/ScoreSimulationInfo';
import {maxBy, minBy, sumBy} from '../../src/primitives/Arrays';
export class FakeScoreSimulationApi implements ScoreSimulationApi {
  async simulate(
    beatmapId: number,
    mods: string[],
    combo: number | null,
    misses: number,
    mehs: number,
    goods: number,
    simulationParams?:
      | {
          dtRate?: number | undefined;
          htRate?: number | undefined;
          difficultyAdjust?:
            | {
                ar?: number | undefined;
                cs?: number | undefined;
                od?: number | undefined;
                hp?: number | undefined;
              }
            | undefined;
        }
      | undefined
  ): Promise<ScoreSimulationInfo> {
    const beatmapIdDigits = beatmapId
      .toString()
      .split('')
      .map(c => parseInt(c));
    const beatmapIdDigitsSum = sumBy(x => x, beatmapIdDigits);
    const maxBeatmapIdDigit = maxBy(x => x, beatmapIdDigits)!;
    const minBeatmapIdDigit = minBy(x => x, beatmapIdDigits)!;
    const scoreCombo = combo ?? goods + mehs;
    const scoreAccuracy =
      maxBeatmapIdDigit / (minBeatmapIdDigit + maxBeatmapIdDigit);
    return {
      score: {
        mods: mods,
        accuracy: scoreAccuracy,
        combo: scoreCombo,
        statistics: {
          great: 0,
          ok: goods,
          meh: mehs,
          miss: misses,
        },
      },
      performanceAttributes: {
        aim: beatmapIdDigits[0],
        speed: beatmapIdDigits[1 % beatmapIdDigits.length],
        accuracy: beatmapIdDigits[2 % beatmapIdDigits.length],
        flashlight: beatmapIdDigits[3 % beatmapIdDigits.length],
        effectiveMissCount: beatmapIdDigits[4 % beatmapIdDigits.length],
        pp: beatmapIdDigitsSum * beatmapIdDigits[0],
      },
      difficultyAttributes: {
        starRating: beatmapIdDigitsSum / beatmapIdDigits[0],
        maxCombo: scoreCombo + beatmapIdDigitsSum,
        aimDifficulty: scoreCombo / beatmapIdDigits[0],
        speedDifficulty:
          scoreCombo / beatmapIdDigits[1 % beatmapIdDigits.length],
        speedNoteCount:
          scoreCombo / beatmapIdDigits[2 % beatmapIdDigits.length],
        sliderFactor: mehs * scoreAccuracy,
        approachRate:
          simulationParams?.difficultyAdjust?.ar ?? 12 * scoreAccuracy,
        overallDifficulty:
          simulationParams?.difficultyAdjust?.od ?? 12 * (1 / scoreAccuracy),
      },
    };
  }
}

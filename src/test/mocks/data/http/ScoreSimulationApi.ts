import {ScoreSimulationApi} from '../../../../main/data/http/ScoreSimulationApi';
import {ScoreSimulationInfoCtb} from '../../../../main/data/http/boundary/ScoreSimulationInfoCtb';
import {ScoreSimulationInfoMania} from '../../../../main/data/http/boundary/ScoreSimulationInfoMania';
import {ScoreSimulationInfoOsu} from '../../../../main/data/http/boundary/ScoreSimulationInfoOsu';
import {ScoreSimulationInfoTaiko} from '../../../../main/data/http/boundary/ScoreSimulationInfoTaiko';
import {max, min, sum} from '../../../../main/primitives/Arrays';
import {ModAcronym} from '../../../../main/primitives/ModAcronym';
export class FakeScoreSimulationApi implements ScoreSimulationApi {
  async status(): Promise<string> {
    return 'ok';
  }

  async simulateOsu(
    beatmapId: number,
    mods: ModAcronym[],
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
  ): Promise<ScoreSimulationInfoOsu> {
    const beatmapIdDigits = beatmapId
      .toString()
      .split('')
      .map(c => parseInt(c));
    const beatmapIdDigitsSum = sum(beatmapIdDigits);
    const maxBeatmapIdDigit = max(beatmapIdDigits);
    const minBeatmapIdDigit = min(beatmapIdDigits);
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

  simulateTaikoDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoTaiko> {
    return this.simulateOtherModes(beatmapId, mods);
  }

  simulateCtbDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoCtb> {
    return this.simulateOtherModes(beatmapId, mods);
  }

  simulateManiaDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoMania> {
    return this.simulateOtherModes(beatmapId, mods);
  }

  async simulateOtherModes(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<
    ScoreSimulationInfoTaiko | ScoreSimulationInfoCtb | ScoreSimulationInfoMania
  > {
    const beatmapIdDigits = beatmapId
      .toString()
      .split('')
      .map(c => parseInt(c));
    const beatmapIdDigitsSum = sum(beatmapIdDigits);
    const maxBeatmapIdDigit = max(beatmapIdDigits);
    return {
      difficultyAttributes: {
        starRating: maxBeatmapIdDigit,
        maxCombo: beatmapIdDigitsSum * (10 + mods.length),
      },
    };
  }
}

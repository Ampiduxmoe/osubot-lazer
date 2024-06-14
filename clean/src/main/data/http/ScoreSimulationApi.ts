import {ScoreSimulationInfoOsu} from './boundary/ScoreSimulationInfoOsu';
import {ScoreSimulationInfoTaiko} from './boundary/ScoreSimulationInfoTaiko';
import {ScoreSimulationInfoCtb} from './boundary/ScoreSimulationInfoCtb';
import {ScoreSimulationInfoMania} from './boundary/ScoreSimulationInfoMania';
export interface ScoreSimulationApi {
  status(): Promise<string>;

  simulateOsu(
    beatmapId: number,
    mods: string[],
    combo: number | null,
    misses: number,
    mehs: number,
    goods: number,
    simulationParams?: {
      dtRate?: number;
      htRate?: number;
      difficultyAdjust?: {
        ar?: number;
        cs?: number;
        od?: number;
        hp?: number;
      };
    }
  ): Promise<ScoreSimulationInfoOsu>;

  simulateTaikoDefault(
    beatmapId: number,
    mods: string[]
  ): Promise<ScoreSimulationInfoTaiko>;

  simulateCtbDefault(
    beatmapId: number,
    mods: string[]
  ): Promise<ScoreSimulationInfoCtb>;

  simulateManiaDefault(
    beatmapId: number,
    mods: string[]
  ): Promise<ScoreSimulationInfoMania>;
}

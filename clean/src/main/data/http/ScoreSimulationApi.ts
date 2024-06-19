import {ScoreSimulationInfoOsu} from './boundary/ScoreSimulationInfoOsu';
import {ScoreSimulationInfoTaiko} from './boundary/ScoreSimulationInfoTaiko';
import {ScoreSimulationInfoCtb} from './boundary/ScoreSimulationInfoCtb';
import {ScoreSimulationInfoMania} from './boundary/ScoreSimulationInfoMania';
import {ModAcronym} from '../../../primitives/ModAcronym';

export interface ScoreSimulationApi {
  status(): Promise<string>;

  simulateOsu(
    beatmapId: number,
    mods: ModAcronym[],
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
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoTaiko>;

  simulateCtbDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoCtb>;

  simulateManiaDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoMania>;
}

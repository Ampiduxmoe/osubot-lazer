import {ScoreSimulationInfo} from '../raw/http/boundary/ScoreSimulationInfo';

export interface ScoreSimulationsDao {
  get(
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
  ): Promise<SimulatedScore>;
}

export type SimulatedScore = Pick<
  ScoreSimulationInfo,
  keyof ScoreSimulationInfo
>;

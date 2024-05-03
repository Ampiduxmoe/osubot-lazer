import {ScoreSimulationInfo} from '../raw/http/boundary/ScoreSimulationInfo';

export type SimulatedScore = ScoreSimulationInfo;

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
    }
  ): Promise<SimulatedScore>;
}

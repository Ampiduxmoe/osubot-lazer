import {ScoreSimulationInfo} from './boundary/ScoreSimulationInfo';
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
  ): Promise<ScoreSimulationInfo>;
}

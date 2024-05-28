import {ScoreSimulationInfo} from '../raw/http/boundary/ScoreSimulationInfo';

export interface ScoreSimulationsDao {
  getForOsu(
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
  ): Promise<SimulatedScoreOsu | undefined>;

  getForTaiko(): Promise<undefined>;
  getForCtb(): Promise<undefined>;
  getForMania(): Promise<undefined>;
}

export type SimulatedScoreOsu = Pick<
  ScoreSimulationInfo,
  keyof ScoreSimulationInfo
>;

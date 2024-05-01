import {ScoreSimulationInfo} from './boundary/ScoreSimulationInfo';
export interface ScoreSimulationApi {
  simulate(
    beatmapId: number,
    mods: string[],
    combo: number | null,
    misses: number,
    mehs: number,
    goods: number
  ): Promise<ScoreSimulationInfo>;
}

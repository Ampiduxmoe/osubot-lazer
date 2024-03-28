import {IPerformanceSimulationResult} from './IPerformanceSimulationResult';
import {IPerformanceSimulationParams} from './IPerformanceSimulationParams';
import axios from 'axios';
import {Result} from '../../primitives/Result';

export class PerformanceCalculator {
  private static simulationEndpoint: string | undefined;

  static setSimulationEndpoint(endpoint: string) {
    PerformanceCalculator.simulationEndpoint = endpoint;
  }

  static async simulate(
    params: IPerformanceSimulationParams
  ): Promise<Result<IPerformanceSimulationResult>> {
    console.log(
      `Trying to get score simulation for ${params.beatmap_id} (${params})...`
    );
    const endpoint = PerformanceCalculator.simulationEndpoint;
    if (!endpoint) {
      const errorText = 'Score simulation endpoint is not defined';
      console.log(errorText);
      return Result.fail([Error(errorText)]);
    }
    const response = await axios.post(endpoint, params);
    if (response.status !== 200) {
      const errorText = `Score simulation endpoint returned ${response.status}`;
      console.log(errorText);
      return Result.fail([Error(errorText)]);
    }
    const rawResult: IPerformanceSimulationResult = response.data;
    return Result.ok(rawResult);
  }
}

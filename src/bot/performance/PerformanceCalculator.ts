import {IPerformanceSimulationResult} from './IPerformanceSimulationResult';
import {IPerformanceSimulationParams} from './IPerformanceSimulationParams';
import axios from 'axios';

export class PerformanceCalculator {
  private static simulationEndpoint: string | undefined;

  static setSimulationEndpoint(endpoint: string) {
    PerformanceCalculator.simulationEndpoint = endpoint;
  }

  static async simulate(
    params: IPerformanceSimulationParams
  ): Promise<IPerformanceSimulationResult | undefined> {
    const endpoint = PerformanceCalculator.simulationEndpoint;
    if (!endpoint) {
      console.log('Simulation endpoint is not defined');
      return undefined;
    }
    const response = await axios.post(endpoint, params);
    if (response.status !== 200) {
      return undefined;
    }
    const rawResult: IPerformanceSimulationResult = response.data;
    return rawResult;
  }
}

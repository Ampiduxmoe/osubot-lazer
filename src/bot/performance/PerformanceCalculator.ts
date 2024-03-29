import {IPerformanceSimulationResult} from './IPerformanceSimulationResult';
import {IPerformanceSimulationParams} from './IPerformanceSimulationParams';
import axios, {AxiosInstance} from 'axios';
import {Result} from '../../primitives/Result';
import {catchedValueToError} from '../../primitives/Errors';

export class PerformanceCalculator {
  private static simulationEndpoint: string | undefined;
  private static httpClient: AxiosInstance | undefined;

  static setSimulationEndpoint(endpoint: string) {
    PerformanceCalculator.simulationEndpoint = endpoint;
    PerformanceCalculator.httpClient = axios.create({
      baseURL: endpoint,
      timeout: 4e3,
      validateStatus: function () {
        return true;
      },
    });
  }

  static async simulate(
    params: IPerformanceSimulationParams
  ): Promise<Result<IPerformanceSimulationResult>> {
    try {
      console.log(
        `Trying to get score simulation for ${
          params.beatmap_id
        } (${JSON.stringify(params)})...`
      );
      const endpoint = PerformanceCalculator.simulationEndpoint;
      const httpClient = PerformanceCalculator.httpClient;
      if (!endpoint || !httpClient) {
        const errorText = 'Score simulation endpoint is not defined';
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      const response = await httpClient.post('/', params);
      if (response.status !== 200) {
        const errorText = `Score simulation endpoint returned ${response.status}`;
        console.log(errorText);
        return Result.fail([Error(errorText)]);
      }
      const rawResult: IPerformanceSimulationResult = response.data;
      return Result.ok(rawResult);
    } catch (e) {
      const errorText = 'Could not reach score simulation endpoint';
      console.log(errorText);
      const internalError = catchedValueToError(e);
      if (internalError !== undefined) {
        console.log(internalError);
        return Result.fail([Error(errorText), internalError]);
      } else {
        console.log('Could not identify error type');
        console.log(e);
        return Result.fail([Error(errorText)]);
      }
    }
  }
}

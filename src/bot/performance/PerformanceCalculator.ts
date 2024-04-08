import {IPerformanceSimulationResult} from './IPerformanceSimulationResult';
import {IPerformanceSimulationParams} from './IPerformanceSimulationParams';
import axios, {AxiosInstance} from 'axios';
import {Result} from '../../primitives/Result';
import {catchedValueToError} from '../../primitives/Errors';

export class PerformanceCalculator {
  private static simulationEndpoint: string | undefined;
  private static httpClient: AxiosInstance | undefined;

  static setSimulationEndpoint(endpoint: string, timeout: number) {
    PerformanceCalculator.simulationEndpoint = endpoint;
    PerformanceCalculator.httpClient = axios.create({
      baseURL: endpoint,
      timeout: timeout,
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

      const isRequestWithHidden = params.mods.find(
        s => s.toLowerCase() === 'hd'
      );
      const isResponseWithHidden = rawResult.score.mods.find(
        s => s.acronym.toLowerCase() === 'hd'
      );
      if (isRequestWithHidden && !isResponseWithHidden) {
        let aim = rawResult.performance_attributes.aim;
        let speed = rawResult.performance_attributes.speed;
        let accuracy = rawResult.performance_attributes.accuracy;
        const flashlight = rawResult.performance_attributes.flashlight;
        const ppPow = (n: number): number => Math.pow(n, 1.1);
        const basePp = Math.pow(
          ppPow(aim) + ppPow(speed) + ppPow(accuracy) + ppPow(flashlight),
          1.0 / 1.1
        );
        const multiplier = rawResult.performance_attributes.pp / basePp;
        const ar = rawResult.difficulty_attributes.approach_rate;
        aim *= 1.0 + 0.04 * (12.0 - ar);
        speed *= 1.0 + 0.04 * (12.0 - ar);
        accuracy *= 1.08;
        const actualPp =
          Math.pow(
            ppPow(aim) + ppPow(speed) + ppPow(accuracy) + ppPow(flashlight),
            1.0 / 1.1
          ) * multiplier;
        rawResult.performance_attributes.pp = actualPp;
        rawResult.score.mods = [...rawResult.score.mods, {acronym: 'HD'}];
      }
      return Result.ok(rawResult);
    } catch (e) {
      const errorText = 'No response from score simulation endpoint';
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

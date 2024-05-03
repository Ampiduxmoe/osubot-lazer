import {ScoreSimulationApi} from '../raw/http/ScoreSimulationApi';
import {ScoreSimulationsDao, SimulatedScore} from './ScoreSimulationsDao';

export class ScoreSimulationsDaoImpl implements ScoreSimulationsDao {
  private api: ScoreSimulationApi;
  constructor(api: ScoreSimulationApi) {
    this.api = api;
  }
  async get(
    beatmapId: number,
    mods: string[],
    combo: number | null,
    misses: number,
    mehs: number,
    goods: number,
    simulationParams?: {
      dtRate?: number;
    }
  ): Promise<SimulatedScore> {
    const scoreSimulation = await this.api.simulate(
      beatmapId,
      mods,
      combo,
      misses,
      mehs,
      goods,
      simulationParams
    );
    const isRequestWithHidden = mods.find(s => s.toLowerCase() === 'hd');
    const isResponseWithHidden = scoreSimulation.score.mods.find(
      m => m.toLowerCase() === 'hd'
    );
    // some versions can't calculate hidden for some reason
    if (isRequestWithHidden && !isResponseWithHidden) {
      let aim = scoreSimulation.performanceAttributes.aim;
      let speed = scoreSimulation.performanceAttributes.speed;
      let accuracy = scoreSimulation.performanceAttributes.accuracy;
      const flashlight = scoreSimulation.performanceAttributes.flashlight;
      const ppPow = (n: number): number => Math.pow(n, 1.1);
      const basePp = Math.pow(
        ppPow(aim) + ppPow(speed) + ppPow(accuracy) + ppPow(flashlight),
        1.0 / 1.1
      );
      const multiplier = scoreSimulation.performanceAttributes.pp / basePp;
      const ar = scoreSimulation.difficultyAttributes.approachRate;
      aim *= 1.0 + 0.04 * (12.0 - ar);
      speed *= 1.0 + 0.04 * (12.0 - ar);
      accuracy *= 1.08;
      const actualPp =
        Math.pow(
          ppPow(aim) + ppPow(speed) + ppPow(accuracy) + ppPow(flashlight),
          1.0 / 1.1
        ) * multiplier;
      scoreSimulation.performanceAttributes.pp = actualPp;
      scoreSimulation.score.mods = [...scoreSimulation.score.mods, 'HD'];
    }
    return scoreSimulation;
  }
}

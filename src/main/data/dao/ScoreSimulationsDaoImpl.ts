import {ScoreSimulationApi} from '../http/ScoreSimulationApi';
import {ScoreSimulationInfoOsu} from '../http/boundary/ScoreSimulationInfoOsu';
import {
  ScoreSimulationsDao,
  SimulatedScoreCtb,
  SimulatedScoreMania,
  SimulatedScoreOsu,
  SimulatedScoreTaiko,
} from '../../application/requirements/dao/ScoreSimulationsDao';
import {ModAcronym} from '../../primitives/ModAcronym';

export class ScoreSimulationsDaoImpl implements ScoreSimulationsDao {
  private apiHealthCheckJob: NodeJS.Timeout | undefined = undefined;
  private _isApiAvailable = true;
  private get isApiAvailable() {
    return this._isApiAvailable;
  }
  private set isApiAvailable(value: boolean) {
    const prevValue = this._isApiAvailable;
    if (value !== prevValue) {
      this._isApiAvailable = value;
      console.log(`Score simulation API became ${value ? '' : 'un'}available`);
    }
  }

  constructor(protected api: ScoreSimulationApi) {}

  async getForOsu(
    beatmapId: number,
    mods: ModAcronym[],
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
  ): Promise<SimulatedScoreOsu | undefined> {
    if (!this.isApiAvailable) {
      return undefined;
    }
    let scoreSimulation: ScoreSimulationInfoOsu;
    try {
      scoreSimulation = await this.api.simulateOsu(
        beatmapId,
        mods,
        combo,
        misses,
        mehs,
        goods,
        simulationParams
      );
    } catch {
      this.isApiAvailable = false;
      return undefined;
    }
    const isRequestWithHidden = mods.find(s => s.is('hd'));
    const isResponseWithHidden = scoreSimulation.score.mods.find(m =>
      m.is('hd')
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
      scoreSimulation.score.mods = [
        ...scoreSimulation.score.mods,
        new ModAcronym('HD'),
      ];
    }
    return scoreSimulation;
  }

  // All other modes are hardly supported by osutools
  // so we just return undefined
  async getForTaiko(): Promise<SimulatedScoreTaiko | undefined> {
    return undefined;
  }

  async getForCtb(): Promise<SimulatedScoreCtb | undefined> {
    return undefined;
  }

  async getForMania(): Promise<SimulatedScoreMania | undefined> {
    return undefined;
  }

  startApiHealthChecks(interval: number) {
    if (this.apiHealthCheckJob !== undefined) {
      return;
    }
    this.apiHealthCheckJob = setInterval(async () => {
      try {
        await this.api.status();
        this.isApiAvailable = true;
      } catch {
        this.isApiAvailable = false;
      }
    }, interval);
    console.log('Score simulation API health checks started');
  }

  stopApiHealthChecks() {
    if (this.apiHealthCheckJob === undefined) {
      return;
    }
    clearInterval(this.apiHealthCheckJob);
    console.log('Score simulation API health checks stopped');
  }
}

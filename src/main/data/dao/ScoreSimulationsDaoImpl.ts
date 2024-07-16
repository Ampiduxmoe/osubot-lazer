import {ScoreSimulationApi} from '../http/ScoreSimulationApi';
import {ScoreSimulationInfoCtb} from '../http/boundary/ScoreSimulationInfoCtb';
import {ScoreSimulationInfoMania} from '../http/boundary/ScoreSimulationInfoMania';
import {ScoreSimulationInfoOsu} from '../http/boundary/ScoreSimulationInfoOsu';
import {ScoreSimulationInfoTaiko} from '../http/boundary/ScoreSimulationInfoTaiko';
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
  private isApiAvailable = true;

  private api: ScoreSimulationApi;
  constructor(api: ScoreSimulationApi) {
    this.api = api;
  }
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

  async getForTaiko(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<SimulatedScoreTaiko | undefined> {
    if (!this.isApiAvailable) {
      return undefined;
    }
    let scoreSimulation: ScoreSimulationInfoTaiko;
    try {
      scoreSimulation = await this.api.simulateTaikoDefault(beatmapId, mods);
    } catch {
      this.isApiAvailable = false;
      return undefined;
    }
    return scoreSimulation;
  }

  async getForCtb(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<SimulatedScoreCtb | undefined> {
    if (!this.isApiAvailable) {
      return undefined;
    }
    let scoreSimulation: ScoreSimulationInfoCtb;
    try {
      scoreSimulation = await this.api.simulateCtbDefault(beatmapId, mods);
    } catch {
      this.isApiAvailable = false;
      return undefined;
    }
    return scoreSimulation;
  }

  async getForMania(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<SimulatedScoreMania | undefined> {
    if (!this.isApiAvailable) {
      return undefined;
    }
    let scoreSimulation: ScoreSimulationInfoMania;
    try {
      scoreSimulation = await this.api.simulateManiaDefault(beatmapId, mods);
    } catch {
      this.isApiAvailable = false;
      return undefined;
    }
    return scoreSimulation;
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

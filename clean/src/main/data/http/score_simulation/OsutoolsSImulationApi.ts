import axios, {AxiosInstance} from 'axios';
import {ScoreSimulationApi} from '../ScoreSimulationApi';
import {ScoreSimulationInfoOsu} from '../boundary/ScoreSimulationInfoOsu';
import {RawScoreSimulationResultOsu} from './RawScoreSimulationResultOsu';
import {round} from '../../../../primitives/Numbers';
import {
  RawScoreSimulationParamsOsu,
  RawScoreSimulationParamsOsuDt,
  RawScoreSimulationParamsOsuHt,
} from './RawSimulationParamsOsu';
import {ScoreSimulationInfoTaiko} from '../boundary/ScoreSimulationInfoTaiko';
import {ScoreSimulationInfoCtb} from '../boundary/ScoreSimulationInfoCtb';
import {ScoreSimulationInfoMania} from '../boundary/ScoreSimulationInfoMania';
import {RawScoreSimulationParamsTaiko} from './RawSimulationParamsTaiko';
import {RawScoreSimulationResultCompact} from './RawScoreSimulationResultCompact';
import {RawScoreSimulationParamsCtb} from './RawSimulationParamsCtb';
import {RawScoreSimulationParamsMania} from './RawSimulationParamsMania';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export class OsutoolsSimulationApi implements ScoreSimulationApi {
  private httpClient: AxiosInstance;
  constructor(endpoint: string, timeout: number) {
    this.httpClient = axios.create({
      baseURL: endpoint,
      timeout: timeout,
      validateStatus: function (status: number) {
        if (status === 200) {
          return true;
        }
        return false;
      },
    });
  }
  async status(): Promise<string> {
    return (await this.httpClient.get('/status')).data;
  }
  async simulateOsu(
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
  ): Promise<ScoreSimulationInfoOsu> {
    let url = '/osu/';
    const body: RawScoreSimulationParamsOsu = {
      beatmap_id: beatmapId,
      mods: mods.map(m => m.toString()),
      combo: combo,
      misses: misses,
      mehs: mehs,
      goods: goods,
    };
    if (
      mods.find(m => m.isAnyOf('dt', 'nc')) !== undefined &&
      simulationParams !== undefined &&
      simulationParams.dtRate !== undefined
    ) {
      url = url + 'dt';
      (body as RawScoreSimulationParamsOsuDt).dt_rate = simulationParams.dtRate;
    } else if (
      mods.find(m => m.isAnyOf('ht', 'dc')) !== undefined &&
      simulationParams !== undefined &&
      simulationParams.htRate !== undefined
    ) {
      url = url + 'ht';
      (body as RawScoreSimulationParamsOsuHt).ht_rate = simulationParams.htRate;
    }
    if (
      mods.find(m => m.is('da')) !== undefined &&
      simulationParams !== undefined &&
      simulationParams.difficultyAdjust !== undefined
    ) {
      const da = simulationParams.difficultyAdjust;
      body.da_settings = {};
      if (da.ar !== undefined) {
        body.da_settings.ar = round(da.ar, 1);
      }
      if (da.cs !== undefined) {
        body.da_settings.cs = round(da.cs, 1);
      }
      if (da.od !== undefined) {
        body.da_settings.od = round(da.od, 1);
      }
      if (da.hp !== undefined) {
        body.da_settings.hp = round(da.hp, 1);
      }
    }
    console.log(`Trying to get score simulation (${JSON.stringify(body)})...`);
    const response = await this.httpClient.post(url, body);
    const simulationResult: RawScoreSimulationResultOsu = response.data;
    const {score, performance_attributes, difficulty_attributes} =
      simulationResult;
    return {
      score: {
        mods: score.mods.map(m => new ModAcronym(m.acronym)),
        accuracy: score.accuracy,
        combo: score.combo,
        statistics: {
          great: score.statistics.great,
          ok: score.statistics.ok,
          meh: score.statistics.meh,
          miss: score.statistics.miss,
        },
      },
      performanceAttributes: {
        aim: performance_attributes.aim,
        speed: performance_attributes.speed,
        accuracy: performance_attributes.accuracy,
        flashlight: performance_attributes.flashlight,
        effectiveMissCount: performance_attributes.effective_miss_count,
        pp: performance_attributes.pp,
      },
      difficultyAttributes: {
        starRating: difficulty_attributes.star_rating,
        maxCombo: difficulty_attributes.max_combo,
        aimDifficulty: difficulty_attributes.aim_difficulty,
        speedDifficulty: difficulty_attributes.speed_difficulty,
        speedNoteCount: difficulty_attributes.speed_note_count,
        sliderFactor: difficulty_attributes.slider_factor,
        approachRate: difficulty_attributes.approach_rate,
        overallDifficulty: difficulty_attributes.overall_difficulty,
      },
    };
  }

  async simulateTaikoDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoTaiko> {
    const url = '/taiko/';
    const body: RawScoreSimulationParamsTaiko = {
      beatmap_id: beatmapId,
      mods: mods.map(m => m.toString()),
      misses: 0,
      goods: 0,
    };
    console.log(`Trying to get score simulation (${JSON.stringify(body)})...`);
    const response = await this.httpClient.post(url, body);
    const simulationResult: RawScoreSimulationResultCompact = response.data;
    return {
      difficultyAttributes: {
        starRating: simulationResult.difficulty_attributes.star_rating,
        maxCombo: simulationResult.difficulty_attributes.max_combo,
      },
    };
  }

  async simulateCtbDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoCtb> {
    const url = '/ctb/';
    const body: RawScoreSimulationParamsCtb = {
      beatmap_id: beatmapId,
      mods: mods.map(m => m.toString()),
      misses: 0,
      droplets: 0,
      tiny_droplets: 0,
    };
    console.log(`Trying to get score simulation (${JSON.stringify(body)})...`);
    const response = await this.httpClient.post(url, body);
    const simulationResult: RawScoreSimulationResultCompact = response.data;
    return {
      difficultyAttributes: {
        starRating: simulationResult.difficulty_attributes.star_rating,
        maxCombo: simulationResult.difficulty_attributes.max_combo,
      },
    };
  }

  async simulateManiaDefault(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<ScoreSimulationInfoMania> {
    const url = '/mania/';
    const body: RawScoreSimulationParamsMania = {
      beatmap_id: beatmapId,
      mods: mods.map(m => m.toString()),
      score: 1e6,
    };
    console.log(`Trying to get score simulation (${JSON.stringify(body)})...`);
    const response = await this.httpClient.post(url, body);
    const simulationResult: RawScoreSimulationResultCompact = response.data;
    return {
      difficultyAttributes: {
        starRating: simulationResult.difficulty_attributes.star_rating,
        maxCombo: simulationResult.difficulty_attributes.max_combo,
      },
    };
  }
}

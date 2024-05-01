import axios, {AxiosInstance} from 'axios';
import {ScoreSimulationApi} from '../ScoreSimulationApi';
import {ScoreSimulationInfo} from '../boundary/ScoreSimulationInfo';
import {RawScoreSimulationResult} from './RawScoreSimulationResult';
import {RawScoreSimulationParams} from './RawSimulationParams';

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
  async simulate(
    beatmapId: number,
    mods: string[],
    combo: number | null,
    misses: number,
    mehs: number,
    goods: number
  ): Promise<ScoreSimulationInfo> {
    const body: RawScoreSimulationParams = {
      beatmap_id: beatmapId,
      mods: mods,
      combo: combo,
      misses: misses,
      mehs: mehs,
      goods: goods,
    };
    console.log(`Trying to get score simulation (${JSON.stringify(body)})...`);
    const response = await this.httpClient.post('/', body);
    const simulationResult: RawScoreSimulationResult = response.data;
    const {score, performance_attributes, difficulty_attributes} =
      simulationResult;
    return {
      score: {
        mods: score.mods.map(m => m.acronym),
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
}

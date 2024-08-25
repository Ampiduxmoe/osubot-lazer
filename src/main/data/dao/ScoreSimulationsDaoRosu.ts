import axios, {AxiosInstance} from 'axios';
import * as fs from 'fs';
import {Beatmap, Performance} from 'rosu-pp-js';
import {
  ScoreSimulationsDao,
  SimulatedScoreCtb,
  SimulatedScoreMania,
  SimulatedScoreOsu,
  SimulatedScoreTaiko,
} from '../../application/requirements/dao/ScoreSimulationsDao';
import {ModAcronym} from '../../primitives/ModAcronym';

export class ScoreSimulationsDaoRosu implements ScoreSimulationsDao {
  private httpClient: AxiosInstance;
  constructor(timeout: number) {
    this.httpClient = axios.create({
      baseURL: 'https://osu.ppy.sh/osu',
      timeout: timeout,
      validateStatus: function (status: number) {
        if (status === 200) {
          return true;
        }
        return false;
      },
    });
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
    const speedRate = simulationParams?.dtRate ?? simulationParams?.htRate;
    const filename = await this.downloadBeatmapIfNeeded(beatmapId);
    const beatmapContents = fs.readFileSync(filename, 'utf8');
    const rosuMap = new Beatmap(beatmapContents);
    const result = new Performance({
      mods: mods.join(''),
      combo: combo ?? undefined,
      misses: misses,
      n50: mehs,
      n100: goods,
      clockRate: speedRate,
      ...(simulationParams?.difficultyAdjust !== undefined
        ? {
            ...simulationParams.difficultyAdjust,
            arWithMods: false,
            csWithMods: false,
            odWithMods: false,
            hpWithMods: false,
          }
        : {}),
    }).calculate(rosuMap);
    const state = result.state!;
    const accuracy =
      (6 * state.n300! + 2 * state.n100! + 1 * state.n50!) /
      (6 * rosuMap.nObjects);
    return {
      score: {
        accuracy: accuracy * 100,
        statistics: {
          great: state.n300!,
          ok: state.n100!,
          meh: state.n50!,
          miss: state.misses!,
        },
      },
      performanceAttributes: {
        pp: result.pp,
      },
      difficultyAttributes: {
        starRating: result.difficulty.stars,
      },
    };
  }

  async getForTaiko(
    beatmapId: number,
    mods: ModAcronym[],
    combo: number | null,
    misses: number,
    goods: number,
    simulationParams?: {
      dtRate?: number;
      htRate?: number;
      difficultyAdjust?: {
        od?: number;
        hp?: number;
      };
    }
  ): Promise<SimulatedScoreTaiko | undefined> {
    const speedRate = simulationParams?.dtRate ?? simulationParams?.htRate;
    const filename = await this.downloadBeatmapIfNeeded(beatmapId);
    const beatmapContents = fs.readFileSync(filename, 'utf8');
    const rosuMap = new Beatmap(beatmapContents);
    const result = new Performance({
      mods: mods.join(''),
      combo: combo ?? undefined,
      misses: misses,
      n100: goods,
      clockRate: speedRate,
      ...(simulationParams?.difficultyAdjust !== undefined
        ? {
            ...simulationParams.difficultyAdjust,
            odWithMods: false,
            hpWithMods: false,
          }
        : {}),
    }).calculate(rosuMap);
    const state = result.state!;
    const nTotal = state.n300! + state.n100! + state.misses!;
    const accuracy = (2 * state.n300! + state.n100!) / (2 * nTotal);
    return {
      score: {
        accuracy: accuracy * 100,
        statistics: {
          great: state.n300!,
          ok: state.n100!,
          miss: state.misses!,
        },
      },
      performanceAttributes: {
        pp: result.pp,
      },
      difficultyAttributes: {
        starRating: result.difficulty.stars,
      },
    };
  }

  async getForCtb(): Promise<SimulatedScoreCtb | undefined> {
    return undefined;
  }

  async getForMania(): Promise<SimulatedScoreMania | undefined> {
    return undefined;
  }

  async downloadBeatmapIfNeeded(beatmapId: number): Promise<string> {
    const filename = `./beatmap_cache/${beatmapId}.osu`;
    if (!fs.existsSync(filename)) {
      await this.downloadBeatmap(beatmapId, filename);
    }
    return filename;
  }

  private _pendingDownloads: Record<number, Promise<void>> = {};
  downloadBeatmap(
    beatmapId: number,
    outputLocationPath: string
  ): Promise<void> {
    this._pendingDownloads[beatmapId] ??= (() => {
      // https://stackoverflow.com/a/61269447
      const writer = fs.createWriteStream(outputLocationPath);
      console.log(`Downloading beatmap ${beatmapId}`);
      const downloadStart = Date.now();
      const result = this.httpClient
        .get(`/${beatmapId}`, {responseType: 'stream'})
        .then(response => {
          return new Promise<void>((resolve, reject) => {
            response.data.pipe(writer);
            let error: unknown = null;
            writer.on('error', err => {
              error = err;
              writer.close();
              reject(err);
            });
            writer.on('close', () => {
              delete this._pendingDownloads[beatmapId];
              if (!error) {
                const downloadTime = Date.now() - downloadStart;
                console.log(
                  `Downloaded beatmap ${beatmapId} in ${downloadTime}ms`
                );
                resolve();
              } else {
                console.log(`Failed to download beatmap ${beatmapId}`);
              }
            });
          });
        });
      return result;
    })();
    return this._pendingDownloads[beatmapId];
  }
}

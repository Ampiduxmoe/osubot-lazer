import axios, {AxiosInstance} from 'axios';
import * as fs from 'fs';
import {Beatmap, GameMode, Performance, ScoreState} from 'rosu-pp-js';
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
    if (rosuMap.mode === GameMode.Osu) {
      rosuMap.convert(GameMode.Taiko);
    }
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

  async getForCtb(
    beatmapId: number,
    mods: ModAcronym[],
    combo: number | null,
    allLargeMisses: number,
    smallTickMisses: number,
    largeTickHits: number | undefined,
    simulationParams?: {
      dtRate?: number;
      htRate?: number;
      difficultyAdjust?: {
        ar?: number;
        cs?: number;
        hp?: number;
      };
    }
  ): Promise<SimulatedScoreCtb | undefined> {
    const speedRate = simulationParams?.dtRate ?? simulationParams?.htRate;
    const filename = await this.downloadBeatmapIfNeeded(beatmapId);
    const beatmapContents = fs.readFileSync(filename, 'utf8');
    const rosuMap = new Beatmap(beatmapContents);
    if (rosuMap.mode === GameMode.Osu) {
      rosuMap.convert(GameMode.Catch);
    }
    const result = new Performance({
      mods: mods.join(''),
      combo: combo ?? undefined,
      misses: allLargeMisses,
      nKatu: smallTickMisses,
      n100: largeTickHits,
      clockRate: speedRate,
      ...(simulationParams?.difficultyAdjust !== undefined
        ? {
            ...simulationParams.difficultyAdjust,
            arWithMods: false,
            csWithMods: false,
            hpWithMods: false,
          }
        : {}),
    }).calculate(rosuMap);
    const state = result.state!;
    const nTotal =
      state.n300! + state.n100! + state.n50! + state.misses! + state.nKatu!;
    const accuracy = (state.n300! + state.n100! + state.n50!) / nTotal;
    return {
      score: {
        accuracy: accuracy * 100,
        statistics: {
          great: state.n300!,
          largeTickHit: state.n100!,
          smallTickHit: state.n50!,
          smallTickMiss: state.nKatu!,
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

  async getForMania(
    beatmapId: number,
    mods: ModAcronym[],
    /** This takes priority over byAccuracy */
    byHitcounts?: {
      perfect: number;
      great: number;
      good: number;
      ok: number;
      meh: number;
      miss: number;
    },
    byAccuracy?: {
      /** Accuracy in percents (0-100) */
      accuracy: number;
      miss: number;
    },
    simulationParams?: {
      dtRate?: number;
      htRate?: number;
      difficultyAdjust?: {
        od?: number;
        hp?: number;
      };
    }
  ): Promise<SimulatedScoreMania | undefined> {
    const speedRate = simulationParams?.dtRate ?? simulationParams?.htRate;
    const filename = await this.downloadBeatmapIfNeeded(beatmapId);
    const beatmapContents = fs.readFileSync(filename, 'utf8');
    const rosuMap = new Beatmap(beatmapContents);
    if (rosuMap.mode === GameMode.Osu) {
      rosuMap.convert(GameMode.Mania);
    }
    const result = (() => {
      if (byHitcounts === undefined) {
        const acc = byAccuracy?.accuracy ?? 100;
        return new Performance({
          mods: mods.join(''),
          misses: byAccuracy?.miss ?? 0,
          accuracy: acc,
          clockRate: speedRate,
          ...(simulationParams?.difficultyAdjust !== undefined
            ? {
                ...simulationParams.difficultyAdjust,
                odWithMods: false,
                hpWithMods: false,
              }
            : {}),
        }).calculate(rosuMap);
      }
      return new Performance({
        mods: mods.join(''),
        misses: byHitcounts.miss,
        nGeki: byHitcounts.perfect,
        n300: byHitcounts.great,
        nKatu: byHitcounts.good,
        n100: byHitcounts.ok,
        n50: byHitcounts.meh,
        clockRate: speedRate,
        ...(simulationParams?.difficultyAdjust !== undefined
          ? {
              ...simulationParams.difficultyAdjust,
              odWithMods: false,
              hpWithMods: false,
            }
          : {}),
      }).calculate(rosuMap);
    })();
    const state = result.state!;
    const {
      nGeki: c305,
      n300: c300,
      nKatu: c200,
      n100: c100,
      n50: c50,
      misses: cm,
    } = state as Required<ScoreState>;
    const nTotal = c305 + c300 + c200 + c100 + c50 + cm;
    const calculatedAcc =
      (305 * c305 + 300 * c300 + 200 * c200 + 100 * c100 + 50 * c50) /
      (305 * nTotal);
    return {
      score: {
        accuracy: calculatedAcc * 100,
        statistics: {
          perfect: c305,
          great: c300,
          good: c200,
          ok: c100,
          meh: c50,
          miss: cm,
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

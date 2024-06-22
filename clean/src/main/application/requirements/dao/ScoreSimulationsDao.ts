import {ModAcronym} from '../../../../primitives/ModAcronym';

export interface ScoreSimulationsDao {
  getForOsu(
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
  ): Promise<SimulatedScoreOsu | undefined>;

  getForTaiko(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<SimulatedScoreTaiko | undefined>;

  getForCtb(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<SimulatedScoreCtb | undefined>;

  getForMania(
    beatmapId: number,
    mods: ModAcronym[]
  ): Promise<SimulatedScoreMania | undefined>;
}

export type SimulatedScoreOsu = {
  performanceAttributes: {
    pp: number;
  };
  difficultyAttributes: {
    starRating: number;
  };
};

export type SimulatedScoreTaiko = {
  difficultyAttributes: {
    starRating: number;
  };
};

export type SimulatedScoreCtb = {
  difficultyAttributes: {
    starRating: number;
  };
};

export type SimulatedScoreMania = {
  difficultyAttributes: {
    starRating: number;
  };
};

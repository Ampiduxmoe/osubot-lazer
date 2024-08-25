import {ModAcronym} from '../../../primitives/ModAcronym';

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
  score: {
    accuracy: number;
    statistics: {
      great: number;
      ok: number;
      meh: number;
      miss: number;
    };
  };
  performanceAttributes: {
    pp: number;
  };
  difficultyAttributes: {
    starRating: number;
  };
};

export type SimulatedScoreTaiko = {
  score: {
    accuracy: number;
    statistics: {
      great: number;
      ok: number;
      miss: number;
    };
  };
  performanceAttributes: {
    pp: number;
  };
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

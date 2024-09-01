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
  ): Promise<SimulatedScoreCtb | undefined>;

  getForMania(
    beatmapId: number,
    mods: ModAcronym[],
    byHitcounts?: {
      perfect: number;
      great: number;
      good: number;
      ok: number;
      meh: number;
      miss: number;
    },
    byAccuracy?: {
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
  score: {
    accuracy: number;
    statistics: {
      great: number;
      largeTickHit: number;
      smallTickHit: number;
      smallTickMiss: number;
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

export type SimulatedScoreMania = {
  score: {
    accuracy: number;
    statistics: {
      perfect: number;
      great: number;
      good: number;
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

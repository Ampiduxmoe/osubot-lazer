import {ModAcronym} from '../../../../primitives/ModAcronym';
import {ScoreSimulationInfoCtb} from '../../../data/http/boundary/ScoreSimulationInfoCtb';
import {ScoreSimulationInfoMania} from '../../../data/http/boundary/ScoreSimulationInfoMania';
import {ScoreSimulationInfoOsu} from '../../../data/http/boundary/ScoreSimulationInfoOsu';
import {ScoreSimulationInfoTaiko} from '../../../data/http/boundary/ScoreSimulationInfoTaiko';

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

export type SimulatedScoreOsu = Pick<
  ScoreSimulationInfoOsu,
  keyof ScoreSimulationInfoOsu
>;

export type SimulatedScoreTaiko = Pick<
  ScoreSimulationInfoTaiko,
  keyof ScoreSimulationInfoTaiko
>;

export type SimulatedScoreCtb = Pick<
  ScoreSimulationInfoCtb,
  keyof ScoreSimulationInfoCtb
>;

export type SimulatedScoreMania = Pick<
  ScoreSimulationInfoMania,
  keyof ScoreSimulationInfoMania
>;

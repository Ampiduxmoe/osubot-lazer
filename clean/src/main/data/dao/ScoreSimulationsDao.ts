import {ScoreSimulationInfoCtb} from '../raw/http/boundary/ScoreSimulationInfoCtb';
import {ScoreSimulationInfoMania} from '../raw/http/boundary/ScoreSimulationInfoMania';
import {ScoreSimulationInfoOsu} from '../raw/http/boundary/ScoreSimulationInfoOsu';
import {ScoreSimulationInfoTaiko} from '../raw/http/boundary/ScoreSimulationInfoTaiko';

export interface ScoreSimulationsDao {
  getForOsu(
    beatmapId: number,
    mods: string[],
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
    mods: string[]
  ): Promise<SimulatedScoreTaiko | undefined>;

  getForCtb(
    beatmapId: number,
    mods: string[]
  ): Promise<SimulatedScoreCtb | undefined>;

  getForMania(
    beatmapId: number,
    mods: string[]
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

import {sum} from '../../../primitives/Arrays';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuUserRecentScore} from '../../requirements/dao/OsuUserRecentScoresDao';

export function getMapProgress(
  score: OsuUserRecentScore,
  ruleset: OsuRuleset
): number {
  const mapProgressCalculators = [
    MapProgressCalculatorOsu,
    MapProgressCalculatorOsuLegacy,
    MapProgressCalculatorTaiko,
    MapProgressCalculatorTaikoLegacy,
    MapProgressCalculatorCtb,
    MapProgressCalculatorCtbLegacy,
    MapProgressCalculatorMania,
    MapProgressCalculatorManiaLegacy,
  ];
  const isLegacyScore = score.mods.find(m => m.acronym.is('CL')) !== undefined;
  const fittingCalculator = mapProgressCalculators.find(
    x => x.ruleset === ruleset && x.isLegacy === isLegacyScore
  );
  if (fittingCalculator === undefined) {
    throw Error('No fitting map progress calculator found');
  }
  return fittingCalculator.calculate(score);
}

type MapProgressCalculator = {
  ruleset: OsuRuleset;
  isLegacy: boolean;
  calculate(score: OsuUserRecentScore): number;
};

function getSum(...arr: (number | undefined)[]): number {
  return sum(arr.map(x => x ?? 0));
}

const MapProgressCalculatorOsu: MapProgressCalculator = {
  ruleset: OsuRuleset.osu,
  isLegacy: false,
  calculate(score: OsuUserRecentScore): number {
    const s = score.statistics;
    const sMax = score.maximumStatistics;
    const totalHits = getSum(s.great, s.ok, s.meh, s.miss);
    const maxHits = sMax.great ?? 0;
    return totalHits / maxHits;
  },
};

const MapProgressCalculatorOsuLegacy: MapProgressCalculator = {
  ruleset: OsuRuleset.osu,
  isLegacy: true,
  calculate(score: OsuUserRecentScore): number {
    const s = score.statistics;
    const map = score.beatmap;
    const totalHits = getSum(s.great, s.ok, s.meh, s.miss);
    const maxHits = map.countCircles + map.countSliders + map.countSpinners;
    return totalHits / maxHits;
  },
};

const MapProgressCalculatorTaiko: MapProgressCalculator = {
  ruleset: OsuRuleset.taiko,
  isLegacy: false,
  calculate(score: OsuUserRecentScore): number {
    const s = score.statistics;
    const sMax = score.maximumStatistics;
    const totalHits = getSum(s.great, s.ok, s.miss);
    const maxHits = sMax.great ?? 0;
    return totalHits / maxHits;
  },
};

const MapProgressCalculatorTaikoLegacy: MapProgressCalculator = {
  ruleset: OsuRuleset.taiko,
  isLegacy: true,
  calculate: MapProgressCalculatorTaiko.calculate,
};

const MapProgressCalculatorCtb: MapProgressCalculator = {
  ruleset: OsuRuleset.ctb,
  isLegacy: false,
  calculate(score: OsuUserRecentScore): number {
    const s = score.statistics;
    const sMax = score.maximumStatistics;
    const totalHits = getSum(s.great, s.largeTickHit, s.largeTickMiss, s.miss);
    const maxHits = getSum(sMax.great, sMax.largeTickHit);
    return totalHits / maxHits;
  },
};

const MapProgressCalculatorCtbLegacy: MapProgressCalculator = {
  ruleset: OsuRuleset.ctb,
  isLegacy: true,
  calculate: MapProgressCalculatorCtb.calculate,
};

const MapProgressCalculatorMania: MapProgressCalculator = {
  ruleset: OsuRuleset.mania,
  isLegacy: false,
  calculate(score: OsuUserRecentScore): number {
    const s = score.statistics;
    const sMax = score.maximumStatistics;
    const totalHits = getSum(s.perfect, s.great, s.good, s.ok, s.meh, s.miss);
    const maxHits = sMax.perfect ?? 0;
    return totalHits / maxHits;
  },
};

const MapProgressCalculatorManiaLegacy: MapProgressCalculator = {
  ruleset: OsuRuleset.mania,
  isLegacy: true,
  calculate: MapProgressCalculatorMania.calculate,
};

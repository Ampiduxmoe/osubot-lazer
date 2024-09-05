import {sum} from '../../../primitives/Arrays';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuUserBestScore} from '../../requirements/dao/OsuUserBestScoresDao';

export function getMapMaxCombo(
  score: OsuUserBestScore,
  ruleset: OsuRuleset
): number {
  const mapMaxComboCalculators = [
    MapMaxComboCalculatorOsu,
    MapMaxComboCalculatorOsuLegacy,
    MapMaxComboCalculatorTaiko,
    MapMaxComboCalculatorTaikoLegacy,
    MapMaxComboCalculatorCtb,
    MapMaxComboCalculatorCtbLegacy,
    MapMaxComboCalculatorMania,
    MapMaxComboCalculatorManiaLegacy,
  ];
  const isLegacyScore = score.mods.find(m => m.acronym.is('CL')) !== undefined;
  const fittingCalculator = mapMaxComboCalculators.find(
    x => x.ruleset === ruleset && x.isLegacy === isLegacyScore
  );
  if (fittingCalculator === undefined) {
    throw Error('No fitting map max combo calculator found');
  }
  return fittingCalculator.calculate(score);
}

type MapMaxComboCalculator = {
  ruleset: OsuRuleset;
  isLegacy: boolean;
  calculate(score: OsuUserBestScore): number;
};

function getSum(...arr: (number | undefined)[]): number {
  return sum(arr.map(x => x ?? 0));
}

const MapMaxComboCalculatorOsu: MapMaxComboCalculator = {
  ruleset: OsuRuleset.osu,
  isLegacy: false,
  calculate(score: OsuUserBestScore): number {
    const sMax = score.maximumStatistics;
    return getSum(sMax.great, sMax.sliderTailHit, sMax.largeTickHit);
  },
};

const MapMaxComboCalculatorOsuLegacy: MapMaxComboCalculator = {
  ruleset: OsuRuleset.osu,
  isLegacy: true,
  calculate(score: OsuUserBestScore): number {
    const sMax = score.maximumStatistics;
    return getSum(sMax.great, sMax.legacyComboIncrease);
  },
};

const MapMaxComboCalculatorTaiko: MapMaxComboCalculator = {
  ruleset: OsuRuleset.taiko,
  isLegacy: false,
  calculate(score: OsuUserBestScore): number {
    const sMax = score.maximumStatistics;
    return sMax.great ?? 0;
  },
};

const MapMaxComboCalculatorTaikoLegacy: MapMaxComboCalculator = {
  ruleset: OsuRuleset.taiko,
  isLegacy: true,
  calculate: MapMaxComboCalculatorTaiko.calculate,
};

const MapMaxComboCalculatorCtb: MapMaxComboCalculator = {
  ruleset: OsuRuleset.ctb,
  isLegacy: false,
  calculate(score: OsuUserBestScore): number {
    const sMax = score.maximumStatistics;
    return getSum(sMax.great, sMax.largeTickHit);
  },
};

const MapMaxComboCalculatorCtbLegacy: MapMaxComboCalculator = {
  ruleset: OsuRuleset.ctb,
  isLegacy: true,
  calculate: MapMaxComboCalculatorCtb.calculate,
};

const MapMaxComboCalculatorMania: MapMaxComboCalculator = {
  ruleset: OsuRuleset.mania,
  isLegacy: false,
  calculate(score: OsuUserBestScore): number {
    const sMax = score.maximumStatistics;
    return sMax.perfect ?? 0;
  },
};

const MapMaxComboCalculatorManiaLegacy: MapMaxComboCalculator = {
  ruleset: OsuRuleset.mania,
  isLegacy: true,
  calculate(score: OsuUserBestScore): number {
    const map = score.beatmap;
    return map.countCircles + 2 * map.countSliders;
  },
};

import {IPerformanceSimulationResult} from '../performance/IPerformanceSimulationResult';
import {PerformanceCalculator} from '../performance/PerformanceCalculator';
import {IScore} from '../../dtos/osu/scores/IScore';
import {IBeatmapExtended} from '../../dtos/osu/beatmaps/IBeatmapExtended';
import {IBeatmapset} from '../../dtos/osu/beatmaps/IBeatmapset';
import {capitalize} from '../../primitives/Strings';
import {Timespan} from '../../primitives/Timespan';
import {round} from '../../primitives/Numbers';

export async function recentTemplate(
  score: IScore,
  map: IBeatmapExtended,
  mapset: IBeatmapset,
  scoreSim: IPerformanceSimulationResult
) {
  const mapStatus = capitalize(map.status);
  const artist = mapset.artist;
  const title = mapset.title;
  const diffname = map.version;
  const mapperName = mapset.creator;
  const mods = score.mods;
  let speed = 1;
  if (mods.includes('HT')) {
    speed = 0.75;
  }
  if (mods.includes('DT')) {
    speed = 1.5;
  }
  const totalLength = new Timespan().addSeconds(map.total_length / speed);
  const z0 = totalLength.minutes <= 9 ? '0' : '';
  const z1 = totalLength.seconds <= 9 ? '0' : '';
  const drainLength = new Timespan().addSeconds(map.hit_length / speed);
  const z2 = drainLength.minutes <= 9 ? '0' : '';
  const z3 = drainLength.seconds <= 9 ? '0' : '';
  const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
  const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;

  const ar = round(scoreSim.difficulty_attributes.approach_rate, 2);
  const cs = round(map.cs * (mods.includes('HR') ? 1.3 : 1), 2);
  const od = round(scoreSim.difficulty_attributes.overall_difficulty, 2);
  const hp = map.drain;
  const statsString = `AR:${ar} CS:${cs} OD:${od} HP:${hp}`;

  const bpm = round(map.bpm! * speed, 2); // mark as not-null because i don't know why would you return null on a map bpm
  const sr = round(scoreSim.difficulty_attributes.star_rating, 2);

  let modsString = '';
  if (mods.length) {
    modsString = `+${mods.join('')}`;
  }

  const totalScore = score.score;
  const combo = score.max_combo;
  const max_combo = scoreSim.difficulty_attributes.max_combo;
  const comboString = `${combo}x/${max_combo}x`;

  const acc = round(score.accuracy * 100, 2);
  const pp = round(scoreSim.performance_attributes.pp, 2);

  const counts = score.statistics;
  const hitcountsTotal =
    counts.count_300 + counts.count_100 + counts.count_50 + counts.count_miss;
  const objectsTotal =
    map.count_circles + map.count_sliders + map.count_spinners;
  const totalToHitRatio = objectsTotal / hitcountsTotal;
  const fcMehs = Math.floor(totalToHitRatio * scoreSim.score.statistics.meh);
  const fcGoods = Math.floor(totalToHitRatio * scoreSim.score.statistics.ok);
  const ppFcSimPromise = PerformanceCalculator.simulate({
    mods: mods,
    combo: scoreSim.difficulty_attributes.max_combo,
    misses: 0,
    mehs: fcMehs,
    goods: fcGoods,
    beatmap_id: scoreSim.score.beatmap_id,
  });
  const ppSsSimPromise = PerformanceCalculator.simulate({
    mods: mods,
    combo: scoreSim.difficulty_attributes.max_combo,
    misses: 0,
    mehs: 0,
    goods: 0,
    beatmap_id: scoreSim.score.beatmap_id,
  });
  const ppFcSim = await ppFcSimPromise;
  const ppSsSim = await ppSsSimPromise;
  const ppFc = ppFcSim ? round(ppFcSim.performance_attributes.pp, 2) : '?';
  const ppSs = ppSsSim ? round(ppSsSim.performance_attributes.pp, 2) : '?';
  const hitcountsString = `${counts.count_300}/${counts.count_100}/${counts.count_50}/${counts.count_miss}`;

  const rankAdjusted = hitcountsTotal < objectsTotal ? 'F' : score.rank;
  const mapProgress = hitcountsTotal / objectsTotal;
  const completionPercent = round(mapProgress * 100, 2);
  const mapCompletionString =
    rankAdjusted !== 'F' ? '' : `(${completionPercent}%)`;

  return `

<${mapStatus}> ${artist} - ${title} [${diffname}] by ${mapperName}
${lengthString} (${drainString}) | ${bpm}BPM | ${sr}✩ ${modsString}
${statsString}

Score: ${totalScore} | Combo: ${comboString}
Accuracy: ${acc}%
PP: ${pp} ⯈ FC: ${ppFc} ⯈ SS: ${ppSs}
Hitcounts: ${hitcountsString}
Grade: ${rankAdjusted} ${mapCompletionString}

Beatmap: ${map.url}

  `.trim();
}

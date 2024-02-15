import {IBeatmapExtended} from '../../dtos/osu/beatmaps/IBeatmapExtended';
import {IBeatmapset} from '../../dtos/osu/beatmaps/IBeatmapset';
import {IScore} from '../../dtos/osu/scores/IScore';
import {round} from '../../src/primitives/Numbers';
import {Timespan} from '../../src/time/Timespan';
import {capitalize} from '../../src/primitives/Strings';

export function recentTemplate(
  score: IScore,
  map: IBeatmapExtended,
  mapset: IBeatmapset
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
  const drainLength = new Timespan().addSeconds(map.hit_length / speed);
  const lengthString = `${totalLength.minutes}:${totalLength.seconds}`;
  const drainString = `${drainLength.minutes}:${drainLength.seconds}`;

  const ar = map.ar;
  const cs = map.cs;
  const od = map.accuracy;
  const hp = map.drain;
  const statsString = `AR:${ar} CS:${cs} OD:${od} HP:${hp}`;

  const bpm = round(map.bpm! * speed, 2); // mark as not-null because i don't know why would you return null on a map bpm
  const sr = map.difficulty_rating;

  let modsString = '';
  if (mods.length) {
    modsString = `+${mods.join('')}`;
  }

  const totalScore = score.score;
  const combo = score.max_combo;
  const max_combo = map.max_combo ?? '?';
  const comboString = `${combo}x/${max_combo}x`;

  const acc = round(score.accuracy * 100, 2);
  const pp = score.pp ?? 0;

  const counts = score.statistics;
  const hitcountsString = `${counts.count_300}/${counts.count_100}/${counts.count_50}/${counts.count_miss}`;

  const hitcountsTotal =
    counts.count_300 + counts.count_100 + counts.count_50 + counts.count_miss;
  const objectsTotal =
    map.count_circles + map.count_sliders + map.count_spinners;
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
PP: ${pp} ⯈ FC: ? ⯈ SS: ?
Hitcounts: ${hitcountsString}
Grade: ${rankAdjusted} ${mapCompletionString}

Beatmap: ${map.url}

  `.trim();
}

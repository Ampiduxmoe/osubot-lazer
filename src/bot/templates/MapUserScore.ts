import {round} from '../../primitives/Numbers';
import {IBeatmapUserScore} from '../../dtos/osu/beatmaps/IBeatmapUserScore';
import {Result} from '../../primitives/Result';
import {capitalize} from '../../primitives/Strings';
import {PerformanceCalculator} from '../performance/PerformanceCalculator';
import {Timespan} from '../../primitives/Timespan';

export async function mapUserScoreTemplate(
  mapScore: IBeatmapUserScore,
  mapsetMetadata: MapUserScoreMapsetMetadata
): Promise<Result<string>> {
  const position = mapScore.position;
  const score = mapScore.score;
  const map = score.beatmap!;
  const user = mapScore.score.user!;
  const username = user.username;

  const mapStatus = capitalize(map.status);
  const artist = mapsetMetadata.artist;
  const title = mapsetMetadata.title;
  const diffname = map.version;
  const mapperName = mapsetMetadata.creator;
  const mods = score.mods;
  let speed = 1;
  if (mods.includes('HT')) {
    speed = 0.75;
  }
  if (mods.includes('DT')) {
    speed = 1.5;
  }

  const counts = score.statistics;
  const hitcountsTotal =
    counts.count_300 + counts.count_100 + counts.count_50 + counts.count_miss;
  const objectsTotal =
    map.count_circles + map.count_sliders + map.count_spinners;
  const totalToHitRatio = objectsTotal / hitcountsTotal;
  const fullPlayMisses = Math.floor(totalToHitRatio * counts.count_miss);
  const fullPlayMehs = Math.floor(totalToHitRatio * counts.count_50);
  const fullPlayGoods = Math.floor(totalToHitRatio * counts.count_100);
  const scoreSimPromise = PerformanceCalculator.simulate({
    mods: mods,
    combo: score.max_combo,
    misses: fullPlayMisses,
    mehs: fullPlayMehs,
    goods: fullPlayGoods,
    beatmap_id: map.id,
  });
  const ppFcSimPromise = PerformanceCalculator.simulate({
    mods: mods,
    combo: null,
    misses: 0,
    mehs: fullPlayMehs,
    goods: fullPlayGoods,
    beatmap_id: map.id,
  });
  const ppSsSimPromise = PerformanceCalculator.simulate({
    mods: mods,
    combo: null,
    misses: 0,
    mehs: 0,
    goods: 0,
    beatmap_id: map.id,
  });
  const scoreSimResult = await scoreSimPromise;
  if (scoreSimResult.isFailure) {
    const failure = scoreSimResult.asFailure();
    const errorText = 'Could not simulate copy of recent score';
    console.log(errorText);
    return Result.fail([Error(errorText), ...failure.errors]);
  }
  const ppFcSimResult = await ppFcSimPromise;
  if (ppFcSimResult.isFailure) {
    const failure = ppFcSimResult.asFailure();
    const errorText = 'Could not simulate FC of recent score';
    console.log(errorText);
    return Result.fail([Error(errorText), ...failure.errors]);
  }
  const ppSsSimResult = await ppSsSimPromise;
  if (ppSsSimResult.isFailure) {
    const failure = ppSsSimResult.asFailure();
    const errorText = 'Could not simulate SS of recent score';
    console.log(errorText);
    return Result.fail([Error(errorText), ...failure.errors]);
  }
  const scoreSim = scoreSimResult.asSuccess().value;
  const ppFcSim = ppFcSimResult.asSuccess().value;
  const ppSsSim = ppSsSimResult.asSuccess().value;

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

  const bpm = round(map.bpm! * speed, 2);
  const sr = round(scoreSim.difficulty_attributes.star_rating, 2);

  const modsString = mods.join('');
  let modsPlusSign = '';
  if (mods.length) {
    modsPlusSign = '+';
  }

  const date = new Date(Date.parse(score.created_at));
  const day = date.getUTCDate();
  const dayFormatted = (day > 9 ? '' : '0') + day;
  const month = date.getUTCMonth() + 1; // why?
  const monthFormatted = (month > 9 ? '' : '0') + month;
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours();
  const hoursFormatted = (hours > 9 ? '' : '0') + hours;
  const minutes = date.getUTCMinutes();
  const minutesFormatted = (minutes > 9 ? '' : '0') + minutes;

  const totalScore = score.score;
  const combo = score.max_combo;
  const max_combo = scoreSim.difficulty_attributes.max_combo;
  const comboString = `${combo}x/${max_combo}x`;

  const acc = round(score.accuracy * 100, 2);
  const pp = round(score.pp || scoreSim.performance_attributes.pp || 0, 2);
  const ppFc = ppFcSim ? round(ppFcSim.performance_attributes.pp, 2) : '?';
  const ppSs = ppSsSim ? round(ppSsSim.performance_attributes.pp, 2) : '?';
  const hitcountsString = `${counts.count_300}/${counts.count_100}/${counts.count_50}/${counts.count_miss}`;
  const rank = score.rank;

  const mapUrlShort = map.url.replace('beatmaps', 'b');

  /* eslint-disable no-irregular-whitespace */
  return Result.ok(
    `
[Server: Bancho]
Лучший скор ${username} на карте [STD]

<${mapStatus}> ${artist} - ${title} [${diffname}] by ${mapperName}
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsPlusSign}${modsString}
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}

${dayFormatted}.${monthFormatted}.${year} ${hoursFormatted}:${minutesFormatted}
Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${pp}　⯈ FC: ${ppFc}　⯈ SS: ${ppSs}
Hitcounts: ${hitcountsString}
Grade: ${rank}　#${position}

Beatmap: ${mapUrlShort}
  `.trim()
  );
}

export interface MapUserScoreMapsetMetadata {
  artist: string;
  title: string;
  creator: string;
}

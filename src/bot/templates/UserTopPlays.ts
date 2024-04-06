import {PerformanceCalculator} from '../performance/PerformanceCalculator';
import {IScore} from '../../dtos/osu/scores/IScore';
import {Timespan} from '../../primitives/Timespan';
import {round} from '../../primitives/Numbers';
import {Result} from '../../primitives/Result';
import {IPerformanceSimulationResult} from '../performance/IPerformanceSimulationResult';

export async function userTopPlaysTemplate(
  scores: IScore[],
  startingPosition: number
): Promise<Result<string>> {
  const scoreSimPromises = scores.map(s =>
    PerformanceCalculator.simulate({
      mods: s.mods,
      combo: s.max_combo,
      misses: s.statistics.count_miss,
      mehs: s.statistics.count_50,
      goods: s.statistics.count_100,
      beatmap_id: s.beatmap!.id,
    })
  );
  const scoreSims: IPerformanceSimulationResult[] = [];
  for (const [index, promise] of scoreSimPromises.entries()) {
    const scoreSim = await promise;
    if (scoreSim.isFailure) {
      const failure = scoreSim.asFailure();
      const errorText = `Could not get max combo for map ${
        scores[index].beatmap!.id
      }`;
      console.log(errorText);
      return Result.fail([Error(errorText), ...failure.errors]);
    }
    scoreSims.push(scoreSim.asSuccess().value);
  }
  const scoreTexts = scores.map((score, index) => {
    const map = score.beatmap!;
    const mapset = score.beatmapset!;

    const scorePosition = startingPosition + index;
    const songTitle = mapset.title;
    const diffname = map.version;
    const mods = score.mods;
    let speed = 1;
    if (mods.includes('HT')) {
      speed = 0.75;
    }
    if (mods.includes('DT')) {
      speed = 1.5;
    }
    const counts = score.statistics;
    const scoreSim = scoreSims[index];

    const totalLength = new Timespan().addSeconds(map.total_length / speed);
    const z0 = totalLength.minutes <= 9 ? '0' : '';
    const z1 = totalLength.seconds <= 9 ? '0' : '';
    const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;

    const ar = round(scoreSim.difficulty_attributes.approach_rate, 2);
    const cs = round(map.cs * (mods.includes('HR') ? 1.3 : 1), 2);
    const od = round(scoreSim.difficulty_attributes.overall_difficulty, 2);
    const hp = map.drain;

    const bpm = round(map.bpm! * speed, 2); // mark as not-null because i don't know why would you return null on a map bpm
    const sr = round(scoreSim.difficulty_attributes.star_rating, 2);

    const modsString = mods.join('');
    let modsPlusSign = '';
    if (mods.length) {
      modsPlusSign = '+';
    }

    const combo = score.max_combo;
    const max_combo = scoreSim.difficulty_attributes.max_combo;
    const comboString = `${combo}x/${max_combo}x`;

    const acc = round(score.accuracy * 100, 2);
    const pp = round(score.pp!, 2);
    const hitcountsString = `${counts.count_300}/${counts.count_100}/${counts.count_50}/${counts.count_miss}`;
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
    const mapUrlShort = map.url.replace('beatmaps', 'b');

    /* eslint-disable no-irregular-whitespace */
    if (scores.length > 3) {
      return `
${scorePosition}. ${songTitle} [${diffname}] ${modsPlusSign}${modsString}
${sr}★　${comboString}　${acc}%
${pp}pp　${mapUrlShort}
      `.trim();
    }

    return `
${scorePosition}. ${songTitle} [${diffname}] ${modsPlusSign}${modsString}
${lengthString} 　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
Grade: ${score.rank}　${comboString}
Accuracy: ${acc}%　${hitcountsString}
PP: ${pp}
${dayFormatted}.${monthFormatted}.${year} ${hoursFormatted}:${minutesFormatted}
${mapUrlShort}
    `.trim();
  });

  const username = scores[0].user!.username;
  const scoresSeparator = scores.length > 3 ? '\n\n' : '\n\n';
  return Result.ok(
    `
[Server: Bancho]
Топ скоры игрока ${username} [STD]

${scoreTexts.join(scoresSeparator)}
  `.trim()
  );
}

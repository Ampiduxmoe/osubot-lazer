import {PerformanceCalculator} from '../performance/PerformanceCalculator';
import {IScore} from '../../dtos/osu/scores/IScore';
import {capitalize} from '../../primitives/Strings';
import {Timespan} from '../../primitives/Timespan';
import {round} from '../../primitives/Numbers';
import {Result} from '../../primitives/Result';
import {IPerformanceSimulationResult} from '../performance/IPerformanceSimulationResult';

export async function userRecentPlaysTemplate(
  scores: IScore[],
  startingPosition: number
): Promise<Result<string>> {
  if (scores.length > 1) {
    return multipleScoresTemplate(scores, startingPosition);
  } else {
    return singleScoreTemplate(scores[0]);
  }
}

async function singleScoreTemplate(score: IScore): Promise<Result<string>> {
  const map = score.beatmap!;
  const mapset = score.beatmapset!;
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

  const totalScore = score.score;
  const combo = score.max_combo;
  const max_combo = scoreSim.difficulty_attributes.max_combo;
  const comboString = `${combo}x/${max_combo}x`;

  const acc = round(score.accuracy * 100, 2);
  const pp = round(score.pp || scoreSim.performance_attributes.pp || 0, 2);
  const ppFc = ppFcSim ? round(ppFcSim.performance_attributes.pp, 2) : '?';
  const ppSs = ppSsSim ? round(ppSsSim.performance_attributes.pp, 2) : '?';
  const hitcountsString = `${counts.count_300}/${counts.count_100}/${counts.count_50}/${counts.count_miss}`;

  const rankAdjusted = hitcountsTotal < objectsTotal ? 'F' : score.rank;
  const mapProgress = hitcountsTotal / objectsTotal;
  const completionPercent = round(mapProgress * 100, 2);
  const mapCompletionString =
    rankAdjusted !== 'F' ? '' : `(${completionPercent}%)`;
  const mapUrlShort = map.url.replace('beatmaps', 'b');

  const specialFormatProbability = 0.002;
  const returnSpecialFormatting = Math.random() < specialFormatProbability;
  if (returnSpecialFormatting) {
    const mapStatusSpecial =
      {
        Graveyard: '​Кладбищѣ​',
        Wip: 'Въ работѣ',
        Pending: 'Сдѣлано',
        Ranked: 'Замѣчательный',
        Approved: 'Хорошій',
        Qualified: 'Разсматриваемый',
        Loved: 'Любимѣйшій',
      }[mapStatus] || 'Неизвѣстно';
    const minutesString = getCorrectCase(
      totalLength.minutes,
      'минуту',
      'минуты',
      'минутъ'
    );
    const secondsString = getCorrectCase(
      totalLength.seconds,
      'секунду',
      'секунды',
      'секундъ'
    );
    const specialModsString = modsString === '' ? 'NM' : modsString;
    const getHitsCase = (n: number) => {
      return getCorrectCase(n, 'попаданіе', 'попаданія', 'попаданій');
    };
    const hits300string = getHitsCase(counts.count_300);
    const name300string = getCorrectCase(
      counts.count_300,
      'отличное',
      'отличныхъ',
      'отличныхъ'
    );
    const hits100string = getHitsCase(counts.count_100);
    const name100string = getCorrectCase(
      counts.count_100,
      'хорошее',
      'хорошихъ',
      'хорошихъ'
    );
    const hits50string = getHitsCase(counts.count_50);
    const name50string = getCorrectCase(
      counts.count_50,
      'плохое',
      'плохихъ',
      'плохихъ'
    );
    const hits0string = getHitsCase(counts.count_miss);
    const name0string = getCorrectCase(
      counts.count_miss,
      'пропущенное',
      'пропущенныхъ',
      'пропущенныхъ'
    );
    const specialRank = {
      SS: 'ЪЪ',
      S: 'Ъ',
      A: 'А',
      B: 'Б',
      C: 'В',
      D: 'Г',
      F: 'Ж',
    }[rankAdjusted]!;
    /* eslint-disable prettier/prettier */
    return Result.ok(
      `
Послѣдняя дѣятельность отъ ${score.user!.username}
<${mapStatusSpecial}> ${artist} - ${title} [${diffname}] сдѣлана ${mapperName}
Длится ${totalLength.minutes} ${minutesString} и ${totalLength.seconds} ${secondsString}
${bpm} ударовъ въ минуту, ${sr.toFixed(2)} трудностей (съ ${specialModsString})
Быстрота суженія ${ar}, величина круговъ ${cs}, точность нажатія ${od} и умаленіе жизней ${hp}

Cобрано ${totalScore} очковъ
${combo} послѣдовательныхъ попаданій изъ ${max_combo}
Мѣткость нажатій ${acc}%
${pp} балловъ исполненія (${ppFc} коли попасть вездѣ и ${ppSs} для безупречнаго прохожденія)
Бойкій молодецъ сдѣлалъ ${counts.count_300} ${name300string} ${hits300string}, ${counts.count_100} ${name100string} ${hits100string}, ${counts.count_50} ${name50string} ${hits50string} и ${counts.count_miss} ${name0string} ${hits0string}
Прохожденіе окончено на ${completionPercent}%
Оцѣнка сего: ${specialRank}

Переходъ на карту: ${mapUrlShort}
    `.trim()
    );
  }

  /* eslint-disable no-irregular-whitespace */
  return Result.ok(
    `
[Server: Bancho]
Последний скор игрока ${score.user!.username} [STD]

<${mapStatus}> ${artist} - ${title} [${diffname}] by ${mapperName}
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsPlusSign}${modsString}
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}

Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${pp}　⯈ FC: ${ppFc}　⯈ SS: ${ppSs}
Hitcounts: ${hitcountsString}
Grade: ${rankAdjusted} ${mapCompletionString}

Beatmap: ${mapUrlShort}
  `.trim()
  );
}

async function multipleScoresTemplate(
  scores: IScore[],
  startingPosition: number
): Promise<Result<string>> {
  const username = scores[0].user!.username;
  const scoreSimPromises = scores.map(s => {
    const map = s.beatmap!;
    const counts = s.statistics;
    const hitcountsTotal =
      counts.count_300 + counts.count_100 + counts.count_50 + counts.count_miss;
    const objectsTotal =
      map.count_circles + map.count_sliders + map.count_spinners;
    const totalToHitRatio = objectsTotal / hitcountsTotal;
    const fullPlayMisses = Math.floor(totalToHitRatio * counts.count_miss);
    const fullPlayMehs = Math.floor(totalToHitRatio * counts.count_50);
    const fullPlayGoods = Math.floor(totalToHitRatio * counts.count_100);
    return PerformanceCalculator.simulate({
      mods: s.mods,
      combo: s.max_combo,
      misses: fullPlayMisses,
      mehs: fullPlayMehs,
      goods: fullPlayGoods,
      beatmap_id: map.id,
    });
  });
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
    const scoreSim = scoreSims[index];

    const scorePosition = startingPosition + index;
    const title = mapset.title;
    const diffname = map.version;
    const mods = score.mods;
    const modsString = mods.join('');
    let modsPlusSign = '';
    if (mods.length) {
      modsPlusSign = '+';
    }

    const sr = round(scoreSim.difficulty_attributes.star_rating, 2);
    const counts = score.statistics;
    const hitcountsTotal =
      counts.count_300 + counts.count_100 + counts.count_50 + counts.count_miss;
    const objectsTotal =
      map.count_circles + map.count_sliders + map.count_spinners;
    const rankAdjusted = hitcountsTotal < objectsTotal ? 'F' : score.rank;
    const mapProgress = hitcountsTotal / objectsTotal;
    const completionPercent = round(mapProgress * 100, 2);
    const mapCompletionString =
      rankAdjusted !== 'F' ? '' : ` (${completionPercent}%)`;
    const combo = score.max_combo;
    const max_combo = scoreSim.difficulty_attributes.max_combo;
    const comboString = `${combo}x/${max_combo}x`;
    const acc = round(score.accuracy * 100, 2);

    const pp = round(score.pp || scoreSim.performance_attributes.pp || 0, 2);
    const mapUrlShort = map.url.replace('beatmaps', 'b');

    /* eslint-disable no-irregular-whitespace */
    return `
${scorePosition}. ${title} [${diffname}] ${modsPlusSign}${modsString}
${sr}★　${rankAdjusted}${mapCompletionString}　${comboString}　${acc}%
${pp}pp　 ${mapUrlShort}
    `.trim();
  });

  const scoresSeparator = '\n\n';
  return Result.ok(
    `
[Server: Bancho]
Последние скоры игрока ${username} [STD]

${scoreTexts.join(scoresSeparator)}
    `.trim()
  );
}

function getCorrectCase(n: number, one: string, two: string, many: string) {
  const preLastDigit = Math.floor((n % 100) / 10);
  if (preLastDigit === 1) {
    return many;
  }
  switch (n % 10) {
    case 1:
      return one;
    case 2:
    case 3:
    case 4:
      return two;
    default:
      return many;
  }
}

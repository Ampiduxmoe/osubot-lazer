/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {
  OsuMap,
  OsuMapUserBestPlays,
  OsuMapUserPlay,
} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {Timespan} from '../../../primitives/Timespan';
import {
  ChatLeaderboardOnMap,
  ChatLeaderboardOnMapExecutionArgs,
} from '../../commands/ChatLeaderboardOnMap';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ChatLeaderboardOnMapVk extends ChatLeaderboardOnMap<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ChatLeaderboardOnMapExecutionArgs> {
    const fail = CommandMatchResult.fail<ChatLeaderboardOnMapExecutionArgs>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    if (command === undefined) {
      return fail;
    }
    return this.matchText(command);
  }

  createMapPlaysMessage(
    map: OsuMap,
    mapPlays: OsuMapUserBestPlays[],
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[],
    isChatLb: boolean
  ): MaybeDeferred<VkOutputMessage> {
    const firstMap = mapPlays[0].collection[0].mapInfo;
    const areAllMapsSame: boolean = (() => {
      for (let i = 1; i < mapPlays.length; i++) {
        const compareMap = mapPlays[i].collection[0].mapInfo;
        if (areMapsDifferentInStats(firstMap, compareMap)) {
          return false;
        }
      }
      return true;
    })();
    const displayedMap = areAllMapsSame ? firstMap : map;
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const {artist, title} = displayedMap.beatmapset;
    const diffname = displayedMap.beatmap.difficultyName;
    const mapperName = displayedMap.beatmapset.creator;
    const mapStatus = displayedMap.beatmapset.status;
    const [lengthString, drainString] = (() => {
      const totalLength = new Timespan().addSeconds(
        displayedMap.beatmap.totalLength
      );
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(
        displayedMap.beatmap.drainLength
      );
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
      return [lengthString, drainString];
    })();
    const bpm = round(displayedMap.beatmap.bpm, 2);
    const sr = displayedMap.beatmap.estimatedStarRating?.toFixed(2) ?? '—';
    const ar = round(displayedMap.beatmap.ar, 2);
    const cs = round(displayedMap.beatmap.cs, 2);
    const od = round(displayedMap.beatmap.od, 2);
    const hp = round(displayedMap.beatmap.hp, 2);
    const maxCombo = displayedMap.beatmap.maxCombo;
    const fewScores = mapPlays.length <= 5;
    const sortedMapPlays = mapPlays.sort((a, b) => {
      const aPlayResult = a.collection[0].playResult;
      const bPlayResult = b.collection[0].playResult;
      const aPp = aPlayResult.pp.estimatedValue ?? 0;
      const bPp = bPlayResult.pp.estimatedValue ?? 0;
      if (aPp === bPp) {
        return bPlayResult.totalScore - aPlayResult.totalScore;
      }
      return bPp - aPp;
    });
    const scoresText = sortedMapPlays
      .map((p, i) =>
        fewScores
          ? this.verboseScoreDescription(
              i + 1,
              p.username,
              p.collection[0].playResult
            )
          : this.shortScoreDescription(
              i + 1,
              p.username,
              p.collection[0].playResult
            )
      )
      .join(fewScores ? '\n' : '\n');
    const couldNotGetSomeStatsMessage =
      mapPlays.find(
        play => play.collection[0].playResult.pp.estimatedValue === undefined
      ) !== undefined
        ? '\n(Не удалось получить часть статистики)'
        : '';
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const mapUrlShort = displayedMap.beatmap.url.replace('beatmaps', 'b');
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Топ ${isChatLb ? 'чата' : 'выбранных игроков'} на карте

${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
Max combo: ${maxCombo}x
${mapUrlShort}

${scoresText}
${couldNotGetSomeStatsMessage}
${missingUsernamesMessage}
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  verboseScoreDescription(
    pos: number,
    username: string,
    play: OsuMapUserPlay
  ): string {
    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed = (dtMod.settings as {speedChange: number}).speedChange ?? 1.5;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed = (htMod.settings as {speedChange: number}).speedChange ?? 0.75;
    }

    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.length > 0 ? '+' + modAcronyms.join('') : '';
    const defaultSpeeds = [1, 1.5, 0.75];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    const combo = play.combo;
    const totalScore = play.totalScore;
    const dateString = getScoreDateString(new Date(play.date));
    const comboString = `${combo}x`;
    const misses = play.orderedHitcounts[play.orderedHitcounts.length - 1];
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(2);
    const ppValueEstimation = play.pp.estimatedValue?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    return `
${pos}. ${username}　${modsString}
　 ${acc}%　${misses}X　${ppEstimationMark}${pp}pp
　 ${totalScore}　${comboString}　${dateString}
    `.trim();
  }

  shortScoreDescription(
    pos: number,
    username: string,
    play: OsuMapUserPlay
  ): string {
    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed = (dtMod.settings as {speedChange: number}).speedChange ?? 1.5;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed = (htMod.settings as {speedChange: number}).speedChange ?? 0.75;
    }

    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.length > 0 ? '+' + modAcronyms.join('') : '';
    const defaultSpeeds = [1, 1.5, 0.75];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    const combo = play.combo;
    const comboString = `${combo}x`;
    const misses = play.orderedHitcounts[play.orderedHitcounts.length - 1];
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(0);
    const ppValueEstimation = play.pp.estimatedValue?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    return `
${pos}. ${username}　${modsString}
　 ${acc}%　${misses}X　${comboString}　${ppEstimationMark}${pp}pp
    `.trim();
  }

  createMapNotFoundMessage(
    server: OsuServer,
    mapId: number
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Карта ${mapId} не найдена
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createNoUsernamesMessage(server: OsuServer): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Невозможно выполнить команду для пустого списка игроков!
Привяжите ник к аккаунту или укажите список ников для отображения
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createBeatmapIdNotSpecifiedMessage(
    server: OsuServer
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не указан ID карты / не найдено последней карты в истории чата
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }

  createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[]
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Скоры на карте не найдены

${missingUsernamesMessage}
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
    });
  }
}

function getScoreDateString(date: Date): string {
  const day = date.getUTCDate();
  const dayFormatted = (day > 9 ? '' : '0') + day;
  const month = date.getUTCMonth() + 1;
  const monthFormatted = (month > 9 ? '' : '0') + month;
  const year = date.getUTCFullYear();
  const datePart = `${dayFormatted}.${monthFormatted}.${year}`;
  return `${datePart}`;
}

function areMapsDifferentInStats(a: OsuMap, b: OsuMap): boolean {
  const keyStats: (keyof OsuMap['beatmap'])[] = [
    'totalLength',
    'drainLength',
    'bpm',
    'estimatedStarRating',
    'ar',
    'cs',
    'od',
    'hp',
    'maxCombo',
  ];
  for (const stat of keyStats) {
    if (a.beatmap[stat] !== b.beatmap[stat]) {
      return true;
    }
  }
  return false;
}

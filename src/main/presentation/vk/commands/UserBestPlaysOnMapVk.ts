/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {
  OsuMap,
  OsuMapUserPlay,
} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {Timespan} from '../../../primitives/Timespan';
import {
  UserBestPlaysOnMap,
  UserBestPlaysOnMapExecutionArgs,
} from '../../commands/UserBestPlaysOnMap';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkBeatmapCoversRepository} from '../../data/repositories/VkBeatmapCoversRepository';
import {VkMessageContext} from '../VkMessageContext';
import {
  VkOutputMessage,
  VkOutputMessageButton,
  VkOutputMessageContent,
} from '../VkOutputMessage';
import {ChatLeaderboardOnMapVk} from './ChatLeaderboardOnMapVk';

export class UserBestPlaysOnMapVk extends UserBestPlaysOnMap<
  VkMessageContext,
  VkOutputMessage
> {
  constructor(
    protected vkBeatmapCovers: VkBeatmapCoversRepository,
    ...parentParams: ConstructorParameters<
      typeof UserBestPlaysOnMap<VkMessageContext, VkOutputMessage>
    >
  ) {
    super(...parentParams);
  }
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserBestPlaysOnMapExecutionArgs> {
    const fail = CommandMatchResult.fail<UserBestPlaysOnMapExecutionArgs>();
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
    mapPlays: UserPlayCollection,
    quantity: number,
    server: OsuServer,
    mode: OsuRuleset,
    username: string
  ): MaybeDeferred<VkOutputMessage> {
    const valuePromise: Promise<VkOutputMessage> = (async () => {
      const areAllMapsSame: boolean = (() => {
        for (let i = 1; i < mapPlays.length; i++) {
          if (
            areMapsDifferentInStats(mapPlays[0].mapInfo, mapPlays[i].mapInfo)
          ) {
            return false;
          }
        }
        return true;
      })();
      const oneScore = quantity === 1;
      const coverAttachment = oneScore
        ? await getOrDownloadCoverAttachment(server, map, this.vkBeatmapCovers)
        : null;
      const attachment = coverAttachment ?? undefined;
      const buttons = oneScore
        ? this.createBeatmapButtons(server, map.beatmap.id)
        : [];
      const couldNotAttachCoverMessage =
        coverAttachment === undefined
          ? '\n\nБГ карты прикрепить не удалось 😭'
          : '';
      if (quantity >= mapPlays.length) {
        const text = this.createMapPlaysText(
          areAllMapsSame ? mapPlays[0].mapInfo : map,
          mapPlays.map(c => c.playResult),
          mapPlays.length,
          server,
          mode,
          username
        );
        const fullText = `${text}${couldNotAttachCoverMessage}`;
        return {
          text: fullText,
          attachment: attachment,
          buttons: buttons,
        };
      }
      const playsChunks: UserPlayCollection[] = [];
      for (let i = 0; i < mapPlays.length; i += quantity) {
        playsChunks.push(mapPlays.slice(i, i + quantity));
      }
      const pageContents: VkOutputMessageContent[] = playsChunks.map(chunk => {
        const areAllMapsInChunkSame: boolean = (() => {
          for (let i = 1; i < chunk.length; i++) {
            if (areMapsDifferentInStats(chunk[0].mapInfo, chunk[i].mapInfo)) {
              return false;
            }
          }
          return true;
        })();
        const text = this.createMapPlaysText(
          areAllMapsInChunkSame ? chunk[0].mapInfo : map,
          chunk.map(c => c.playResult),
          quantity,
          server,
          mode,
          username
        );
        const fullText = `${text}${couldNotAttachCoverMessage}`;
        return {
          text: fullText,
          attachment: attachment,
          buttons: buttons,
        };
      });
      return {
        pagination: {
          contents: pageContents,
          startingIndex: 0,
          buttonText: (currentIndex: number, targetIndex: number) => {
            if (targetIndex < 0 || targetIndex >= mapPlays.length) {
              return undefined;
            }
            if (targetIndex > currentIndex) {
              return `▶　(${targetIndex + 1}/${mapPlays.length})`;
            }
            return `(${targetIndex + 1}/${mapPlays.length})　◀`;
          },
        },
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createMapPlaysText(
    map: OsuMap,
    mapPlays: OsuMapUserPlay[],
    targetQuantity: number,
    server: OsuServer,
    mode: OsuRuleset,
    username: string
  ): string {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const {artist, title} = map.beatmapset;
    const diffname = map.beatmap.difficultyName;
    const mapperName = map.beatmapset.creator;
    const mapStatus = map.beatmapset.status;
    const [lengthString, drainString] = (() => {
      const totalLength = new Timespan().addSeconds(map.beatmap.totalLength);
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(map.beatmap.drainLength);
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
      return [lengthString, drainString];
    })();
    const bpm = round(map.beatmap.bpm, 2);
    const sr = map.beatmap.estimatedStarRating?.toFixed(2) ?? '—';
    const ar = round(map.beatmap.ar, 2);
    const cs = round(map.beatmap.cs, 2);
    const od = round(map.beatmap.od, 2);
    const hp = round(map.beatmap.hp, 2);
    const fewScores = targetQuantity <= 5;
    const oneScore = targetQuantity === 1;
    const maxCombo = map.beatmap.maxCombo;
    const scoresString = oneScore ? 'Лучший скор' : 'Лучшие скоры';
    const maxComboString = oneScore ? '' : `\nMax combo: ${maxCombo}x`;
    const scoresText = mapPlays
      .map(p =>
        fewScores
          ? oneScore
            ? this.verboseScoreDescription(p, maxCombo)
            : this.normalScoreDescription(p)
          : this.shortScoreDescription(p)
      )
      .join(fewScores ? '\n' : '\n');
    const couldNotGetSomeStatsMessage =
      mapPlays.find(play => play.pp.estimatedValue === undefined) !== undefined
        ? '\n(Не удалось получить часть статистики)'
        : '';
    const mapUrlShort = map.beatmap.url.replace('beatmaps', 'b');
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
${scoresString} ${username} на карте

${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}${maxComboString}
${mapUrlShort}

${scoresText}
${couldNotGetSomeStatsMessage}
    `.trim();
    return text;
  }

  verboseScoreDescription(play: OsuMapUserPlay, mapMaxCombo: number): string {
    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed = (dtMod.settings as {speedChange: number}).speedChange ?? 1.5;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed = (htMod.settings as {speedChange: number}).speedChange ?? 0.75;
    }

    const pos = play.sortedPosition;
    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.length > 0 ? '+' + modAcronyms.join('') : '';
    const defaultSpeeds = [1, 1.5, 0.75];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    const grade = play.grade;
    const combo = play.combo;
    const totalScore = play.totalScore;
    const dateString = getScoreDateStringWithTime(new Date(play.date));
    const comboString = `${combo}x/${mapMaxCombo}x`;
    const hitcountsString = play.orderedHitcounts.join('/');
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(2);
    const ppValueEstimation = play.pp.estimatedValue?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    const ppFc =
      play.pp.ifFc === undefined ? '—' : `~${play.pp.ifFc.toFixed(0)}`;
    const ppSs =
      play.pp.ifSs === undefined ? '—' : `~${play.pp.ifSs.toFixed(0)}`;
    const ppForFcAndSsString = [play.pp.ifFc, play.pp.ifSs].includes(undefined)
      ? ''
      : `　FC: ${ppFc}　SS: ${ppSs}`;
    return `
${pos}. ${modsString}
Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${ppEstimationMark}${pp}${ppForFcAndSsString}
Hitcounts: ${hitcountsString}
Grade: ${grade}
${dateString}
    `.trim();
  }

  normalScoreDescription(play: OsuMapUserPlay): string {
    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed = (dtMod.settings as {speedChange: number}).speedChange ?? 1.5;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed = (htMod.settings as {speedChange: number}).speedChange ?? 0.75;
    }

    const pos = play.sortedPosition;
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
${pos}. ${modsString}
　 ${acc}%　${misses}X　${ppEstimationMark}${pp}pp
　 ${totalScore}　${comboString}　${dateString}
    `.trim();
  }

  shortScoreDescription(play: OsuMapUserPlay): string {
    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed = (dtMod.settings as {speedChange: number}).speedChange ?? 1.5;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed = (htMod.settings as {speedChange: number}).speedChange ?? 0.75;
    }

    const pos = play.sortedPosition;
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
${pos}. ${modsString}
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
    });
  }

  createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Пользователь с ником ${usernameInput} не найден
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
  }

  createUsernameNotBoundMessage(
    server: OsuServer
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не установлен ник!
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
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
    });
  }

  createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Скоры на карте не найдены
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
  }

  createBeatmapButtons(
    server: OsuServer,
    beatmapId: number
  ): VkOutputMessageButton[][] {
    const buttons: VkOutputMessageButton[] = [];
    const userBestPlaysOnMapCommand = this.otherCommands.find(
      x => x instanceof UserBestPlaysOnMapVk
    );
    if (userBestPlaysOnMapCommand !== undefined) {
      buttons.push({
        text: 'Мой скор на карте',
        command: userBestPlaysOnMapCommand.unparse({
          server: server,
          beatmapId: beatmapId,
        }),
      });
    }
    const chatLeaderboardOnMapCommand = this.otherCommands.find(
      x => x instanceof ChatLeaderboardOnMapVk
    );
    if (chatLeaderboardOnMapCommand !== undefined) {
      buttons.push({
        text: 'Топ чата на карте',
        command: chatLeaderboardOnMapCommand.unparse({
          server: server,
          beatmapId: beatmapId,
        }),
      });
    }
    return buttons.map(x => [x]);
  }
}

type CoverAttachment = string | null | undefined;

function getScoreDateString(date: Date): string {
  const day = date.getUTCDate();
  const dayFormatted = (day > 9 ? '' : '0') + day;
  const month = date.getUTCMonth() + 1;
  const monthFormatted = (month > 9 ? '' : '0') + month;
  const year = date.getUTCFullYear();
  const datePart = `${dayFormatted}.${monthFormatted}.${year}`;
  return `${datePart}`;
}

function getScoreDateStringWithTime(date: Date): string {
  const day = date.getUTCDate();
  const dayFormatted = (day > 9 ? '' : '0') + day;
  const month = date.getUTCMonth() + 1;
  const monthFormatted = (month > 9 ? '' : '0') + month;
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours();
  const hoursFormatted = (hours > 9 ? '' : '0') + hours;
  const minutes = date.getUTCMinutes();
  const minutesFormatted = (minutes > 9 ? '' : '0') + minutes;
  const datePart = `${dayFormatted}.${monthFormatted}.${year}`;
  const timePart = `${hoursFormatted}:${minutesFormatted}`;
  return `${datePart} ${timePart}`;
}

async function getOrDownloadCoverAttachment(
  server: OsuServer,
  mapInfo: OsuMap,
  coversRepository: VkBeatmapCoversRepository
): Promise<CoverAttachment> {
  const existingAttachment = await coversRepository.get({
    server: server,
    beatmapsetId: mapInfo.beatmapset.id,
  });
  if (existingAttachment !== undefined) {
    return existingAttachment.attachment;
  }
  try {
    const newAttachment = await coversRepository.uploadAndSave(
      server,
      mapInfo.beatmapset.id,
      mapInfo.beatmapset.coverUrl
    );
    if (newAttachment === undefined) {
      return null;
    }
    return newAttachment;
  } catch (e) {
    return undefined;
  }
}

type UserPlayCollection = {playResult: OsuMapUserPlay; mapInfo: OsuMap}[];

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

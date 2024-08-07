/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {
  BestPlay,
  OsuUserBestPlays,
} from '../../../application/usecases/get_user_best_plays/GetUserBestPlaysResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {Timespan} from '../../../primitives/Timespan';
import {
  UserBestPlays,
  UserBestPlaysExecutionArgs,
} from '../../commands/UserBestPlays';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkBeatmapCoversRepository} from '../../data/repositories/VkBeatmapCoversRepository';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage, VkOutputMessageButton} from '../VkOutputMessage';
import {ChatLeaderboardOnMapVk} from './ChatLeaderboardOnMapVk';
import {UserBestPlaysOnMapVk} from './UserBestPlaysOnMapVk';

export class UserBestPlaysVk extends UserBestPlays<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserBestPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserBestPlaysExecutionArgs>();
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

  createBestPlaysMessage(
    bestPlays: OsuUserBestPlays,
    server: OsuServer,
    mode: OsuRuleset
  ): MaybeDeferred<VkOutputMessage> {
    const valuePromise: Promise<VkOutputMessage> = (async () => {
      const serverString = OsuServer[server];
      const modeString = OsuRuleset[mode];
      const oneScore = bestPlays.plays.length === 1;
      const scoresString = oneScore ? 'Лучший скор' : 'Лучшие скоры';
      const username = bestPlays.username;
      const scoresText = bestPlays.plays
        .map(p => {
          if (oneScore) {
            return this.verboseScoreDescription(p);
          }
          if (bestPlays.plays.length > 3) {
            return this.shortScoreDescription(p);
          }
          return this.defaultScoreDescription(p);
        })
        .join('\n\n');
      const couldNotGetSomeStatsMessage =
        bestPlays.plays.find(
          play => play.beatmap.estimatedStarRating === undefined
        ) !== undefined
          ? '\n(Не удалось получить часть статистики)'
          : '';
      const coverAttachment = oneScore
        ? await getOrDownloadCoverAttachment(
            server,
            bestPlays.plays[0],
            this.vkBeatmapCovers
          )
        : null;
      const couldNotAttachCoverMessage =
        coverAttachment === undefined
          ? '\n\nБГ карты прикрепить не удалось 😭'
          : '';
      const text = `
[Server: ${serverString}, Mode: ${modeString}]
${scoresString} ${username}

${scoresText}
${couldNotGetSomeStatsMessage}${couldNotAttachCoverMessage}
      `.trim();
      return {
        text: text,
        attachment: coverAttachment ?? undefined,
        buttons: oneScore
          ? this.createBeatmapButtons(server, bestPlays.plays[0].beatmap.id)
          : [],
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  verboseScoreDescription(play: BestPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;
    const absPos = `${play.absolutePosition}`;
    const {artist, title} = mapset;
    const diffname = map.difficultyName;
    const mapperName = mapset.creator;
    const [lengthString, drainString] = (() => {
      const totalLength = new Timespan().addSeconds(map.totalLength);
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(map.drainLength);
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
      return [lengthString, drainString];
    })();
    const bpm = round(map.bpm, 2);
    const sr = play.beatmap.estimatedStarRating?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    const modsString = modAcronyms.join('');
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const ar = round(play.beatmap.ar, 2);
    const cs = round(play.beatmap.cs, 2);
    const od = round(play.beatmap.od, 2);
    const hp = round(play.beatmap.hp, 2);
    const {totalScore} = play;
    const combo = play.combo;
    const maxCombo = play.beatmap.maxCombo ?? '—';
    const comboString = `${combo}x/${maxCombo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const pp = play.pp.toFixed(2);
    const hitcounts = play.orderedHitcounts;
    const hitcountsString = hitcounts.join('/');
    const {grade} = play;
    const scoreDateString = getScoreDateString(new Date(play.date));
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${absPos}. ${artist} - ${title} [${diffname}] by ${mapperName}
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsPlusSign}${modsString}
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}

Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${pp}
Hitcounts: ${hitcountsString}
Grade: ${grade}
${scoreDateString}

Beatmap: ${mapUrlShort}
    `.trim();
  }

  defaultScoreDescription(play: BestPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;
    const absPos = `${play.absolutePosition}`;
    const {title} = mapset;
    const diffname = map.difficultyName;
    const lengthString = (() => {
      const totalLength = new Timespan().addSeconds(map.totalLength);
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      return `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
    })();
    const bpm = round(map.bpm, 2);
    const sr = play.beatmap.estimatedStarRating?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    const modsString = modAcronyms.join('');
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const ar = round(play.beatmap.ar, 2);
    const cs = round(play.beatmap.cs, 2);
    const od = round(play.beatmap.od, 2);
    const hp = round(play.beatmap.hp, 2);
    const combo = play.combo;
    const maxCombo = play.beatmap.maxCombo ?? '—';
    const comboString = `${combo}x/${maxCombo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const pp = play.pp.toFixed(2);
    const hitcounts = play.orderedHitcounts;
    const hitcountsString = hitcounts.join('/');
    const {grade} = play;
    const scoreDateString = getScoreDateString(new Date(play.date));
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${absPos}. ${title} [${diffname}] ${modsPlusSign}${modsString}
${lengthString}　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
Grade: ${grade}　${comboString}
Accuracy: ${acc}%　${hitcountsString}
PP: ${pp}
${scoreDateString}
${mapUrlShort}
    `.trim();
  }

  shortScoreDescription(play: BestPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;
    const absPos = `${play.absolutePosition}`;
    const {title} = mapset;
    const diffname = map.difficultyName;
    const sr = play.beatmap.estimatedStarRating?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    const modsString = modAcronyms.join('');
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const combo = play.combo;
    const maxCombo = play.beatmap.maxCombo;
    const comboString = `${combo}x/${maxCombo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const pp = play.pp.toFixed(2);
    const {grade} = play;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${absPos}. ${title} [${diffname}] ${modsPlusSign}${modsString}
${sr}★　${comboString}　${acc}%　${grade}
${pp}pp　 ${mapUrlShort}
    `.trim();
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
      attachment: undefined,
      buttons: undefined,
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
      attachment: undefined,
      buttons: undefined,
    });
  }

  createNoBestPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Нет лучших скоров
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      attachment: undefined,
      buttons: undefined,
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
          username: undefined,
          startPosition: undefined,
          quantity: undefined,
          modPatterns: undefined,
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
          usernameList: undefined,
          modPatterns: undefined,
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
  playInfo: BestPlay,
  coversRepository: VkBeatmapCoversRepository
): Promise<CoverAttachment> {
  const existingAttachment = await coversRepository.get({
    server: server,
    beatmapsetId: playInfo.beatmapset.id,
  });
  if (existingAttachment !== undefined) {
    return existingAttachment.attachment;
  }
  try {
    const newAttachment = await coversRepository.downloadAndSave(
      server,
      playInfo.beatmapset.id,
      playInfo.beatmapset.coverUrl
    );
    if (newAttachment === undefined) {
      return null;
    }
    return newAttachment;
  } catch (e) {
    return undefined;
  }
}

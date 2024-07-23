/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {GetAppUserInfoUseCase} from '../../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {
  OsuMap,
  OsuMapUserBestPlays,
  OsuMapUserPlay,
} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {GetBeatmapUsersBestScoresUseCase} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {Timespan} from '../../../primitives/Timespan';
import {
  ChatLeaderboardOnMap,
  ChatLeaderboardOnMapExecutionArgs,
} from '../../commands/ChatLeaderboardOnMap';
import {
  GetInitiatorAppUserId,
  GetLastSeenBeatmapId,
  GetLocalAppUserIds,
  SaveLastSeenBeatmapId,
} from '../../commands/common/Signatures';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkChatLastBeatmapsRepository} from '../../data/repositories/VkChatLastBeatmapsRepository';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ChatLeaderboardOnMapVk extends ChatLeaderboardOnMap<
  VkMessageContext,
  VkOutputMessage
> {
  vkChatLastBeatmaps: VkChatLastBeatmapsRepository;
  constructor(
    textProcessor: TextProcessor,
    getInitiatorAppUserId: GetInitiatorAppUserId<VkMessageContext>,
    getLocalAppUserIds: GetLocalAppUserIds<VkMessageContext>,
    getLastSeenBeatmapId: GetLastSeenBeatmapId<VkMessageContext>,
    saveLastSeenBeatmapId: SaveLastSeenBeatmapId<VkMessageContext>,
    getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase,
    getAppUserInfo: GetAppUserInfoUseCase,
    vkChatLastBeatmaps: VkChatLastBeatmapsRepository
  ) {
    super(
      textProcessor,
      getInitiatorAppUserId,
      getLocalAppUserIds,
      getLastSeenBeatmapId,
      saveLastSeenBeatmapId,
      getBeatmapBestScores,
      getAppUserInfo
    );
    this.vkChatLastBeatmaps = vkChatLastBeatmaps;
  }

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

  async createMapPlaysMessage(
    map: OsuMap,
    mapPlays: OsuMapUserBestPlays[],
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[],
    isChatLb: boolean
  ): Promise<VkOutputMessage> {
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
    const maxCombo = map.beatmap.maxCombo;
    const fewScores = mapPlays.length <= 5;
    const sortedMapPlays = mapPlays.sort((a, b) => {
      const aPp = a.plays[0].pp.estimatedValue ?? 0;
      const bPp = b.plays[0].pp.estimatedValue ?? 0;
      if (aPp === bPp) {
        return b.plays[0].totalScore - a.plays[0].totalScore;
      }
      return bPp - aPp;
    });
    const scoresText = sortedMapPlays
      .map((p, i) =>
        fewScores
          ? this.verboseScoreDescription(i + 1, p.username, p.plays[0])
          : this.shortScoreDescription(i + 1, p.username, p.plays[0])
      )
      .join(fewScores ? '\n' : '\n');
    const couldNotGetSomeStatsMessage =
      mapPlays.find(play => play.plays[0].pp.estimatedValue === undefined) !==
      undefined
        ? '\n(Не удалось получить часть статистики)'
        : '';
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const mapUrlShort = map.beatmap.url.replace('beatmaps', 'b');
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
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
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

  async createMapNotFoundMessage(
    server: OsuServer,
    mapId: number
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Карта ${mapId} не найдена
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createNoUsernamesMessage(server: OsuServer): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Невозможно выполнить команду для пустого списка игроков!
Привяжите ник к аккаунту или укажите список ников для отображения
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createBeatmapIdNotSpecifiedMessage(
    server: OsuServer
  ): Promise<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не указан ID карты / не найдено последней карты в истории чата
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  async createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[]
  ): Promise<VkOutputMessage> {
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
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
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

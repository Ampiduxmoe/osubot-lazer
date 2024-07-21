/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage, VkOutputMessageButton} from './base/VkOutputMessage';
import {NOTICE_ABOUT_SPACES_IN_USERNAMES, VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {GetAppUserInfoUseCase} from '../../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {clamp, round} from '../../../primitives/Numbers';
import {
  OWN_COMMAND_PREFIX,
  MODS,
  SERVER_PREFIX,
  BEATMAP_ID,
  START_POSITION,
  QUANTITY,
  USERNAME,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {Timespan} from '../../../primitives/Timespan';
import {ModArg} from '../../common/arg_processing/ModArg';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {GetBeatmapUsersBestScoresUseCase} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {
  OsuMap,
  OsuMapUserPlay,
} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {VkBeatmapCoversRepository} from '../../data/repositories/VkBeatmapCoversRepository';
import {VkChatLastBeatmapsRepository} from '../../data/repositories/VkChatLastBeatmapsRepository';
import {ChatLeaderboardOnMap} from './ChatLeaderboardOnMap';

export class UserBestPlaysOnMap extends VkCommand<
  UserBestPlaysOnMapExecutionArgs,
  UserBestPlaysOnMapViewParams
> {
  internalName = UserBestPlaysOnMap.name;
  shortDescription = 'топ скоры игрока на карте';
  longDescription = 'Показывает ваши лучшие скоры выбранной на карте';
  notice = NOTICE_ABOUT_SPACES_IN_USERNAMES;

  static prefixes = new CommandPrefixes('mp', 'mpb', 'MapPersonalBest');
  prefixes = UserBestPlaysOnMap.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserBestPlaysOnMap.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: BEATMAP_ID, isOptional: true},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MODS, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  vkBeatmapCovers: VkBeatmapCoversRepository;
  vkChatLastBeatmaps: VkChatLastBeatmapsRepository;
  constructor(
    textProcessor: TextProcessor,
    getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase,
    getAppUserInfo: GetAppUserInfoUseCase,
    vkBeatmapCovers: VkBeatmapCoversRepository,
    vkChatLastBeatmaps: VkChatLastBeatmapsRepository
  ) {
    super(UserBestPlaysOnMap.commandStructure);
    this.textProcessor = textProcessor;
    this.getBeatmapBestScores = getBeatmapBestScores;
    this.getAppUserInfo = getAppUserInfo;
    this.vkBeatmapCovers = vkBeatmapCovers;
    this.vkChatLastBeatmaps = vkChatLastBeatmaps;
  }

  matchVkMessage(
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

    const tokens = this.textProcessor.tokenize(command);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    const beatmapId = argsProcessor.use(BEATMAP_ID).extract();
    const username = argsProcessor.use(USERNAME).extract();
    const mods = argsProcessor.use(MODS).extract();
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.replyMessage?.senderId ?? ctx.senderId,
      vkPeerId: ctx.peerId,
      server: server,
      beatmapId: beatmapId,
      username: username,
      mods: mods,
      startPosition: startPosition,
      quantity: quantity,
    });
  }

  async process(
    args: UserBestPlaysOnMapExecutionArgs
  ): Promise<UserBestPlaysOnMapViewParams> {
    const username = await (async () => {
      if (args.username !== undefined) {
        return args.username;
      }
      const appUserInfoResponse = await this.getAppUserInfo.execute({
        id: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
        server: args.server,
      });
      return appUserInfoResponse.userInfo?.username;
    })();
    if (username === undefined) {
      return {
        server: args.server,
        beatmapIdInput: args.beatmapId,
        usernameInput: undefined,
        username: undefined,
        mode: undefined,
        map: undefined,
        plays: undefined,
        startPosition: undefined,
        coverAttachment: undefined,
      };
    }
    const beatmapId =
      args.beatmapId ??
      (
        await this.vkChatLastBeatmaps.get({
          peerId: args.vkPeerId,
          server: args.server,
        })
      )?.beatmapId;
    if (beatmapId === undefined) {
      return {
        server: args.server,
        beatmapIdInput: undefined,
        usernameInput: args.username,
        username: username,
        mode: undefined,
        map: undefined,
        plays: undefined,
        startPosition: undefined,
        coverAttachment: undefined,
      };
    }
    const leaderboardResponse = await this.getBeatmapBestScores.execute({
      appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
      server: args.server,
      beatmapId: beatmapId,
      usernames: [username],
      startPosition: Math.max(args.startPosition ?? 1, 1),
      quantityPerUser: clamp(args.quantity ?? 1, 1, 10),
      mods: args.mods ?? [],
    });
    if (leaderboardResponse.failureReason !== undefined) {
      switch (leaderboardResponse.failureReason) {
        case 'beatmap not found':
          return {
            server: args.server,
            beatmapIdInput: args.beatmapId,
            usernameInput: args.username,
            username: username,
            mode: undefined,
            map: undefined,
            plays: undefined,
            startPosition: undefined,
            coverAttachment: undefined,
          };
      }
    }
    if (leaderboardResponse.mapPlays!.length === 0) {
      return {
        server: args.server,
        beatmapIdInput: args.beatmapId,
        usernameInput: args.username,
        username: username,
        mode: leaderboardResponse.ruleset!,
        map: leaderboardResponse.map!,
        plays: undefined,
        startPosition: undefined,
        coverAttachment: undefined,
      };
    }
    const mapPlays =
      args.quantity === undefined && args.startPosition !== undefined
        ? leaderboardResponse.mapPlays![0].plays.slice(0, args.startPosition)
        : leaderboardResponse.mapPlays![0].plays.slice(
            0,
            (args.startPosition ?? 1) + (args.quantity ?? 1) - 1
          );
    if (args.beatmapId !== undefined) {
      await this.vkChatLastBeatmaps.save(
        args.vkPeerId,
        args.server,
        args.beatmapId
      );
    }
    return {
      server: args.server,
      beatmapIdInput: args.beatmapId,
      usernameInput: args.username,
      username: leaderboardResponse.mapPlays![0].username,
      mode: leaderboardResponse.ruleset!,
      map: leaderboardResponse.map!,
      plays: mapPlays,
      startPosition: args.startPosition ?? 1,
      coverAttachment:
        mapPlays.length === 1
          ? await getOrDownloadCoverAttachment(
              leaderboardResponse.map!,
              this.vkBeatmapCovers
            )
          : null,
    };
  }

  createOutputMessage(params: UserBestPlaysOnMapViewParams): VkOutputMessage {
    const {
      server,
      beatmapIdInput,
      usernameInput,
      username,
      mode,
      map,
      plays,
      coverAttachment,
    } = params;
    if (username === undefined) {
      if (usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(server);
      }
      return this.createUserNotFoundMessage(server, usernameInput);
    }
    if (map === undefined) {
      if (beatmapIdInput === undefined) {
        return this.createBeatmapIdNotSpecifiedMessage(server);
      }
      return this.createMapNotFoundMessage(server, beatmapIdInput);
    }
    if (plays === undefined) {
      return this.createNoMapPlaysMessage(server, mode!);
    }
    return this.createMapPlaysMessage(
      map,
      plays,
      server,
      mode!,
      username,
      coverAttachment
    );
  }

  createMapPlaysMessage(
    map: OsuMap,
    mapPlays: OsuMapUserPlay[],
    server: OsuServer,
    mode: OsuRuleset,
    username: string,
    coverAttachment: CoverAttachment
  ): VkOutputMessage {
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
    const fewScores = mapPlays.length <= 5;
    const oneScore = mapPlays.length === 1;
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
    const couldNotAttachCoverMessage =
      coverAttachment === undefined
        ? '\n\nБГ карты прикрепить не удалось 😭'
        : '';
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
${scoresString} ${username} на карте

${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}${maxComboString}
${mapUrlShort}

${scoresText}
${couldNotGetSomeStatsMessage}${couldNotAttachCoverMessage}
    `.trim();
    return {
      text: text,
      attachment: coverAttachment ?? undefined,
      buttons: oneScore
        ? this.createBeatmapButtons(server, map.beatmap.id)
        : [],
    };
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

  createMapNotFoundMessage(server: OsuServer, mapId: number): VkOutputMessage {
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

  createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Пользователь с ником ${usernameInput} не найден
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createUsernameNotBoundMessage(server: OsuServer): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не установлен ник!
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createBeatmapIdNotSpecifiedMessage(server: OsuServer): VkOutputMessage {
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

  createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Скоры на карте не найдены
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createBeatmapButtons(
    server: OsuServer,
    beatmapId: number
  ): VkOutputMessageButton[][] {
    const buttons: VkOutputMessageButton[] = [];
    const userBestPlaysOnMapCommand = this.otherCommands.find(
      x => x instanceof UserBestPlaysOnMap
    );
    if (userBestPlaysOnMapCommand !== undefined) {
      buttons.push({
        text: 'Мой скор на карте',
        command: userBestPlaysOnMapCommand.unparse({
          server: server,
          beatmapId: beatmapId,
          username: undefined,
          vkUserId: -1,
          vkPeerId: -1,
          startPosition: undefined,
          quantity: undefined,
          mods: undefined,
        }),
      });
    }
    const chatLeaderboardOnMapCommand = this.otherCommands.find(
      x => x instanceof ChatLeaderboardOnMap
    );
    if (chatLeaderboardOnMapCommand !== undefined) {
      buttons.push({
        text: 'Топ чата на карте',
        command: chatLeaderboardOnMapCommand.unparse({
          server: server,
          beatmapId: beatmapId,
          vkUserId: -1,
          vkChatId: -1,
          vkPeerId: -1,
          usernameList: undefined,
          mods: undefined,
        }),
      });
    }
    return buttons.map(x => [x]);
  }

  unparse(args: UserBestPlaysOnMapExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.beatmapId !== undefined) {
      tokens.push(BEATMAP_ID.unparse(args.beatmapId));
    }
    if (args.username !== undefined) {
      tokens.push(USERNAME.unparse(args.username));
    }
    if (args.mods !== undefined) {
      tokens.push(MODS.unparse(args.mods));
    }
    if (args.startPosition !== undefined) {
      tokens.push(START_POSITION.unparse(args.startPosition));
    }
    if (args.quantity !== undefined) {
      tokens.push(QUANTITY.unparse(args.quantity));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

type UserBestPlaysOnMapExecutionArgs = {
  vkUserId: number;
  vkPeerId: number;
  server: OsuServer;
  beatmapId: number | undefined;
  username: string | undefined;
  mods: ModArg[] | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
};

type UserBestPlaysOnMapViewParams = {
  server: OsuServer;
  beatmapIdInput: number | undefined;
  usernameInput: string | undefined;
  username: string | undefined;
  mode: OsuRuleset | undefined;
  map: OsuMap | undefined;
  plays: OsuMapUserPlay[] | undefined;
  startPosition: number | undefined;
  coverAttachment: CoverAttachment;
};

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
  mapInfo: OsuMap,
  coversRepository: VkBeatmapCoversRepository
): Promise<CoverAttachment> {
  const existingAttachment = await coversRepository.get({
    beatmapsetId: mapInfo.beatmapset.id,
  });
  if (existingAttachment !== undefined) {
    return existingAttachment.attachment;
  }
  try {
    const newAttachment = await coversRepository.downloadAndSave(
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

/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {GetAppUserInfoUseCase} from '../../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {round} from '../../../../primitives/Numbers';
import {
  OWN_COMMAND_PREFIX,
  MODS,
  SERVER_PREFIX,
  NUMBER,
  USERNAME_LIST,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {Timespan} from '../../../../primitives/Timespan';
import {ModArg} from '../../common/arg_processing/ModArg';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {GetBeatmapUsersBestScoresUseCase} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresUseCase';
import {
  OsuMap,
  OsuMapUserBestPlays,
  OsuMapUserPlay,
} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';

export class BeatmapLeaderboard extends VkCommand<
  BeatmapLeaderboardExecutionArgs,
  BeatmapLeaderboardViewParams
> {
  internalName = BeatmapLeaderboard.name;
  shortDescription = 'топ скоры на карте';
  longDescription =
    'показывает лучшие скоры игроков на карте (по умолчанию игроки беседы)';

  static prefixes = new CommandPrefixes('lb', 'leaderboard');
  prefixes = BeatmapLeaderboard.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = BeatmapLeaderboard.COMMAND_PREFIX;
  private static BEATMAP_ID = NUMBER('map_id', 'ID карты', 0, 1e9);
  private BEATMAP_ID = BeatmapLeaderboard.BEATMAP_ID;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: this.BEATMAP_ID, isOptional: true},
    {argument: USERNAME_LIST, isOptional: true},
    {argument: MODS, isOptional: true},
  ];

  getChatMemberIds: (chatId: number) => Promise<number[]>;
  getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    getChatMemberIds: (chatId: number) => Promise<number[]>,
    getBeatmapBestScores: GetBeatmapUsersBestScoresUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(BeatmapLeaderboard.commandStructure);
    this.getChatMemberIds = getChatMemberIds;
    this.getBeatmapBestScores = getBeatmapBestScores;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<BeatmapLeaderboardExecutionArgs> {
    const fail = CommandMatchResult.fail<BeatmapLeaderboardExecutionArgs>();
    let command: string | undefined = undefined;
    if (ctx.hasMessagePayload && ctx.messagePayload!.target === APP_CODE_NAME) {
      command = ctx.messagePayload!.command;
    } else if (ctx.hasText) {
      command = ctx.text!;
    }
    if (command === undefined) {
      return fail;
    }

    const splitSequence = ' ';
    const tokens = command.split(splitSequence);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const beatmapId = argsProcessor.use(this.BEATMAP_ID).extract();
    const usernameList = argsProcessor.use(USERNAME_LIST).extract();
    const mods = argsProcessor.use(MODS).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (
      server === undefined ||
      ownPrefix === undefined ||
      beatmapId === undefined
    ) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      vkChatId: ctx.chatId,
      server: server,
      beatmapId: beatmapId,
      usernameList: usernameList,
      mods: mods,
    });
  }

  async process(
    args: BeatmapLeaderboardExecutionArgs
  ): Promise<BeatmapLeaderboardViewParams> {
    const usernames = await (async () => {
      if (args.usernameList === undefined || args.usernameList.isAdditive) {
        const conversationMembers =
          args.vkChatId === undefined
            ? [args.vkUserId]
            : await this.getChatMemberIds(args.vkChatId);
        const appUserInfoResponses = await Promise.all(
          conversationMembers.map(id =>
            this.getAppUserInfo.execute({
              id: VkIdConverter.vkUserIdToAppUserId(id),
              server: args.server,
            })
          )
        );
        const chatUsernames = appUserInfoResponses
          .filter(x => x.userInfo !== undefined)
          .map(x => x.userInfo!.username);
        return [...chatUsernames, ...(args.usernameList?.usernames ?? [])];
      }
      return args.usernameList.usernames;
    })();
    if (usernames.length === 0) {
      return {
        server: args.server,
        usernames: [],
        beatmapIdInput: args.beatmapId,
        mode: undefined,
        map: undefined,
        plays: undefined,
        missingUsernames: undefined,
      };
    }
    const leaderboardResponse = await this.getBeatmapBestScores.execute({
      appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
      server: args.server,
      beatmapId: args.beatmapId,
      usernames: usernames,
      quantityPerUser: 1,
      mods: args.mods ?? [],
    });
    if (leaderboardResponse.failureReason !== undefined) {
      switch (leaderboardResponse.failureReason) {
        case 'beatmap not found':
          return {
            server: args.server,
            usernames: usernames,
            beatmapIdInput: args.beatmapId,
            mode: undefined,
            map: undefined,
            plays: undefined,
            missingUsernames: undefined,
          };
      }
    }
    return {
      server: args.server,
      usernames: usernames,
      beatmapIdInput: args.beatmapId,
      mode: leaderboardResponse.ruleset!,
      map: leaderboardResponse.map!,
      plays: leaderboardResponse.mapPlays!,
      missingUsernames: leaderboardResponse.missingUsernames!,
    };
  }

  createOutputMessage(params: BeatmapLeaderboardViewParams): VkOutputMessage {
    const {
      server,
      usernames,
      beatmapIdInput,
      mode,
      map,
      plays,
      missingUsernames,
    } = params;
    if (usernames.length === 0) {
      return this.createNoUsernamesMessage(server);
    }
    if (map === undefined || plays === undefined) {
      if (beatmapIdInput === undefined) {
        return this.createBeatmapIdNotSpecifiedMessage(server);
      }
      return this.createMapNotFoundMessage(server, beatmapIdInput);
    }
    if (plays.length === 0) {
      return this.createNoMapPlaysMessage(server, mode!, missingUsernames!);
    }
    return this.createMapPlaysMessage(
      map,
      plays,
      server,
      mode!,
      missingUsernames!
    );
  }

  createMapPlaysMessage(
    map: OsuMap,
    mapPlays: OsuMapUserBestPlays[],
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[]
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
    const mapUrlShort = map.beatmap.url.replace('beatmap', 'b');
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
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
    const ppValue = play.pp.value?.toFixed(2);
    const ppValueEstimation = play.pp.estimatedValue?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    return `
${pos}. ${username}　${modsString}
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

  createNoUsernamesMessage(server: OsuServer): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Невозможно выполнить команду для пустого списка игроков!
Привяжите ник к аккаунту или явно укажите список ников для отображения.
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
Не указан ID карты / не найдено последней карты в истории чата.
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[]
  ): VkOutputMessage {
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

type BeatmapLeaderboardExecutionArgs = {
  vkUserId: number;
  vkChatId: number | undefined;
  server: OsuServer;
  beatmapId: number;
  usernameList: {usernames: string[]; isAdditive: boolean} | undefined;
  mods: ModArg[] | undefined;
};

type BeatmapLeaderboardViewParams = {
  server: OsuServer;
  usernames: string[];
  beatmapIdInput: number | undefined;
  mode: OsuRuleset | undefined;
  map: OsuMap | undefined;
  plays: OsuMapUserBestPlays[] | undefined;
  missingUsernames: string[] | undefined;
};

function getScoreDateString(date: Date): string {
  const day = date.getUTCDate();
  const dayFormatted = (day > 9 ? '' : '0') + day;
  const month = date.getUTCMonth() + 1;
  const monthFormatted = (month > 9 ? '' : '0') + month;
  const year = date.getUTCFullYear();
  const datePart = `${dayFormatted}.${monthFormatted}.${year}`;
  return `${datePart}`;
}

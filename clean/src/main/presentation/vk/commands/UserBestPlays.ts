/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {GetAppUserInfoUseCase} from '../../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {clamp, round} from '../../../../primitives/Numbers';
import {
  OWN_COMMAND_PREFIX,
  MODS,
  QUANTITY,
  SERVER_PREFIX,
  START_POSITION,
  USERNAME,
  MODE,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {Timespan} from '../../../../primitives/Timespan';
import {ModArg} from '../../common/arg_processing/ModArg';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {GetUserBestPlaysUseCase} from '../../../application/usecases/get_user_best_plays/GetUserBestPlaysUseCase';
import {
  BestPlay,
  OsuUserBestPlays,
} from '../../../application/usecases/get_user_best_plays/GetUserBestPlaysResponse';

export class UserBestPlays extends VkCommand<
  UserBestPlaysExecutionArgs,
  UserBestPlaysViewParams
> {
  internalName = UserBestPlays.name;
  shortDescription = 'топ скоры игрока';
  longDescription = 'Отображает лучшие скоры игрока';

  static prefixes = new CommandPrefixes('p', 'pb', 'PersonalBest');
  prefixes = UserBestPlays.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserBestPlays.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MODS, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  tokenize: (text: string) => string[];
  getUserBestPlays: GetUserBestPlaysUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    tokenize: (text: string) => string[],
    getUserBestPlays: GetUserBestPlaysUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserBestPlays.commandStructure);
    this.tokenize = tokenize;
    this.getUserBestPlays = getUserBestPlays;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserBestPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserBestPlaysExecutionArgs>();
    let command: string | undefined = undefined;
    if (ctx.hasMessagePayload && ctx.messagePayload!.target === APP_CODE_NAME) {
      command = ctx.messagePayload!.command;
    } else if (ctx.hasText) {
      command = ctx.text!;
    }
    if (command === undefined) {
      return fail;
    }

    const tokens = this.tokenize(command);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const server = argsProcessor.use(SERVER_PREFIX).at(0).extract();
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();
    const mods = argsProcessor.use(MODS).extract();
    const mode = argsProcessor.use(MODE).extract();
    const username = argsProcessor.use(USERNAME).extract();

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      server: server,
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
      mode: mode,
    });
  }

  async process(
    args: UserBestPlaysExecutionArgs
  ): Promise<UserBestPlaysViewParams> {
    let username = args.username;
    let mode = args.mode;
    if (username === undefined) {
      const appUserInfoResponse = await this.getAppUserInfo.execute({
        id: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
        server: args.server,
      });
      const boundUser = appUserInfoResponse.userInfo;
      if (boundUser === undefined) {
        return {
          server: args.server,
          mode: args.mode,
          usernameInput: undefined,
          bestPlays: undefined,
        };
      }
      username = boundUser.username;
      mode ??= boundUser.ruleset;
    }
    const mods = args.mods ?? [];
    const startPosition = clamp(args.startPosition ?? 1, 1, 100);
    let quantity: number;
    if (args.startPosition === undefined) {
      quantity = clamp(args.quantity ?? 3, 1, 10);
    } else {
      quantity = clamp(args.quantity ?? 1, 1, 10);
    }
    const bestPlaysResult = await this.getUserBestPlays.execute({
      appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
      server: args.server,
      username: username,
      ruleset: mode,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
    });
    if (bestPlaysResult.isFailure) {
      const internalFailureReason = bestPlaysResult.failureReason!;
      switch (internalFailureReason) {
        case 'user not found':
          return {
            server: args.server,
            mode: mode,
            usernameInput: args.username,
            bestPlays: undefined,
          };
      }
    }
    return {
      server: args.server,
      mode: bestPlaysResult.ruleset!,
      usernameInput: args.username,
      bestPlays: bestPlaysResult.bestPlays!,
    };
  }

  createOutputMessage(params: UserBestPlaysViewParams): VkOutputMessage {
    const {server, mode, bestPlays} = params;
    if (bestPlays === undefined) {
      if (params.usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(params.server);
      }
      return this.createUserNotFoundMessage(
        params.server,
        params.usernameInput
      );
    }
    if (bestPlays.plays.length === 0) {
      return this.createNoBestPlaysMessage(server, mode!);
    }
    return this.createBestPlaysMessage(bestPlays, server, mode!);
  }

  createBestPlaysMessage(
    bestPlays: OsuUserBestPlays,
    server: OsuServer,
    mode: OsuRuleset
  ): VkOutputMessage {
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
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
${scoresString} ${username}

${scoresText}
${couldNotGetSomeStatsMessage}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  verboseScoreDescription(play: BestPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;
    const absPos = `\\${play.absolutePosition}`;
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
    const absPos = `\\${play.absolutePosition}`;
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
    const absPos = `\\${play.absolutePosition}`;
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

  createNoBestPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Нет лучших скоров
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}

type UserBestPlaysExecutionArgs = {
  vkUserId: number;
  server: OsuServer;
  username: string | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
  mods: ModArg[] | undefined;
  mode: OsuRuleset | undefined;
};

type UserBestPlaysViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  usernameInput: string | undefined;
  bestPlays: OsuUserBestPlays | undefined;
};

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

/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {CommandPrefixes, VkCommand} from './base/VkCommand';
import {GetRecentPlaysUseCase} from '../../../domain/usecases/get_recent_plays/GetRecentPlaysUseCase';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {SERVERS} from '../../common/OsuServers';
import {GetAppUserInfoUseCase} from '../../../domain/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {clamp, round} from '../../../../primitives/Numbers';
import {
  OsuUserRecentPlays,
  RecentPlay,
  SettingsDT,
  SettingsDefaults,
} from '../../../domain/usecases/get_recent_plays/GetRecentPlaysResponse';
import {
  OWN_COMMAND_PREFIX,
  MODS,
  QUANTITY,
  SERVER_PREFIX,
  START_POSITION,
  USERNAME,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {Timespan} from '../../../../primitives/Timespan';

export class UserRecentPlays extends VkCommand<
  UserRecentPlaysExecutionArgs,
  UserRecentPlaysViewParams
> {
  internalName = UserRecentPlays.name;
  shortDescription = 'последние скоры';
  longDescription =
    'Отображает последние скоры игрока\n' +
    'Используйте ' +
    UserRecentPlays.recentPlaysPrefixes.map(s => `"${s}"`).join(' или ') +
    ' для всех скоров, и ' +
    UserRecentPlays.recentPassesPrefixes.map(s => `"${s}"`).join(' или ') +
    ' для пассов';

  static recentPlaysPrefixes = new CommandPrefixes('r', 'recent');
  static recentPassesPrefixes = new CommandPrefixes('rp', 'recentpass');
  static prefixes = new CommandPrefixes(
    ...UserRecentPlays.recentPlaysPrefixes,
    ...UserRecentPlays.recentPassesPrefixes
  );
  prefixes = UserRecentPlays.prefixes;

  commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: OWN_COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MODS, isOptional: true},
  ];

  getRecentPlays: GetRecentPlaysUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    getRecentPlays: GetRecentPlaysUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super();
    this.getRecentPlays = getRecentPlays;
    this.getAppUserInfo = getAppUserInfo;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserRecentPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserRecentPlaysExecutionArgs>();
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
    const commandPrefix = argsProcessor.use(OWN_COMMAND_PREFIX).at(0).extract();
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();
    const mods = argsProcessor.use(MODS).extract();
    const usernameParts: string[] = [];
    let usernamePart = argsProcessor.use(USERNAME).extract();
    while (usernamePart !== undefined) {
      usernameParts.push(usernamePart);
      usernamePart = argsProcessor.use(USERNAME).extract();
    }
    const username =
      usernameParts.length === 0
        ? undefined
        : usernameParts.join(splitSequence);

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (server === undefined || commandPrefix === undefined) {
      return fail;
    }
    if (!this.prefixes.matchIgnoringCase(commandPrefix)) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      server: server,
      passesOnly: UserRecentPlays.recentPassesPrefixes.includes(commandPrefix),
      username: username,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
    });
  }

  async process(
    args: UserRecentPlaysExecutionArgs
  ): Promise<UserRecentPlaysViewParams> {
    let username = args.username;
    if (username === undefined) {
      const appUserInfoResponse = await this.getAppUserInfo.execute({
        id: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
        server: args.server,
      });
      const boundUser = appUserInfoResponse.userInfo;
      if (boundUser === undefined) {
        return {
          server: args.server,
          passesOnly: args.passesOnly,
          usernameInput: undefined,
          recentPlays: undefined,
        };
      }
      username = boundUser.username;
    }
    const mods = args.mods || [];
    const startPosition = clamp(
      mods.length > 0 ? 1 : args.startPosition || 1,
      1,
      100
    );
    // eslint-disable-next-line prettier/prettier
    const quantity = clamp(
      mods.length > 0 ? 100 : args.quantity || 1,
      1,
      100
    );
    const recentPlaysResult = await this.getRecentPlays.execute({
      server: args.server,
      username: username,
      includeFails: !args.passesOnly,
      startPosition: startPosition,
      quantity: quantity,
      mods: mods,
    });
    if (recentPlaysResult.isFailure) {
      const internalFailureReason = recentPlaysResult.failureReason!;
      switch (internalFailureReason) {
        case 'user not found':
          return {
            server: args.server,
            passesOnly: args.passesOnly,
            usernameInput: args.username,
            recentPlays: undefined,
          };
        default:
          throw Error('Switch case is not exhaustive');
      }
    }
    return {
      server: args.server,
      passesOnly: args.passesOnly,
      usernameInput: args.username,
      recentPlays: recentPlaysResult.recentPlays!,
    };
  }

  createOutputMessage(params: UserRecentPlaysViewParams): VkOutputMessage {
    const {server, passesOnly, recentPlays} = params;
    if (recentPlays === undefined) {
      if (params.usernameInput === undefined) {
        return this.createUsernameNotBoundMessage(params.server);
      }
      return this.createUserNotFoundMessage(
        params.server,
        params.usernameInput
      );
    }
    const {username} = recentPlays;
    if (recentPlays.plays.length === 0) {
      return this.createNoRecentPlaysMessage(server, passesOnly, username);
    }

    const serverString = OsuServer[params.server];
    const oneScore = recentPlays.plays.length === 1;
    const passesString = oneScore ? 'Последний пасс' : 'Последние пассы';
    const scoresString = oneScore ? 'Последний скор' : 'Последние скоры';
    const scoresText = recentPlays.plays
      .map(p =>
        oneScore
          ? this.verboseScoreDescription(p)
          : this.shortScoreDescription(p)
      )
      .join('\n');
    const text = `
[Server: ${serverString}]
${passesOnly ? passesString : scoresString} ${username}
${scoresText}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  verboseScoreDescription(play: RecentPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    const modAcronyms = play.mods.map(m => m.acronym);
    let speed = 1;
    if (modAcronyms.includes('DT')) {
      const dt = play.mods.find(m => m.acronym === 'DT');
      if (dt !== undefined && dt.settings !== undefined) {
        speed =
          (dt.settings as SettingsDT).speed_change ??
          SettingsDefaults.DT.speed_change!;
      }
    }
    // TODO HT

    const mapStatus = mapset.status;
    const {artist, title} = mapset;
    const diffname = map.difficultyName;
    const mapperName = mapset.creator;
    const totalLength = new Timespan().addSeconds(map.totalLength / speed);
    const z0 = totalLength.minutes <= 9 ? '0' : '';
    const z1 = totalLength.seconds <= 9 ? '0' : '';
    const drainLength = new Timespan().addSeconds(map.drainLength / speed);
    const z2 = drainLength.minutes <= 9 ? '0' : '';
    const z3 = drainLength.seconds <= 9 ? '0' : '';
    const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
    const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
    const bpm = round(map.bpm * speed, 2);
    const sr = play.stars.toFixed(2);
    let modsString = modAcronyms.join('');
    if (speed !== 1 && speed !== 1.5) {
      modsString += ` (${speed}x)`;
    }
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const ar = round(play.ar, 2);
    const cs = round(play.cs, 2);
    const od = round(play.od, 2);
    const hp = round(play.hp, 2);
    const {totalScore} = play;
    const combo = play.combo;
    const max_combo = play.beatmap.maxCombo;
    const comboString = `${combo}x/${max_combo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const pp = play.pp.value.toFixed(2);
    const ppFc = play.pp.ifFc.toFixed(2);
    const ppSs = play.pp.ifSs.toFixed(2);
    const hitcountsString = `${play.countGreat}/${play.countOk}/${play.countMeh}/${play.countMiss}`;
    const {grade} = play;
    const hitcountsTotal =
      play.countGreat + play.countOk + play.countMeh + play.countMiss;
    const objectsTotal =
      map.countCircles + map.countSliders + map.countSpinners;
    const mapProgress = hitcountsTotal / objectsTotal;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString = play.passed ? '' : `(${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
<${mapStatus}> ${artist} - ${title} [${diffname}] by ${mapperName}
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsPlusSign}${modsString}
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}

Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${pp}　⯈ FC: ${ppFc}　⯈ SS: ${ppSs}
Hitcounts: ${hitcountsString}
Grade: ${grade} ${mapCompletionString}

Beatmap: ${mapUrlShort}
    `.trim();
  }

  shortScoreDescription(play: RecentPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    const modAcronyms = play.mods.map(m => m.acronym);

    const {title} = mapset;
    const diffname = map.difficultyName;
    const sr = map.stars;
    const modsString = modAcronyms.join('');
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const combo = play.combo;
    const max_combo = play.beatmap.maxCombo;
    const comboString = `${combo}x/${max_combo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const pp = play.pp.value.toFixed(2);
    const {grade} = play;
    const hitcountsTotal =
      play.countGreat + play.countOk + play.countMeh + play.countMiss;
    const objectsTotal =
      map.countCircles + map.countSliders + map.countSpinners;
    const mapProgress = hitcountsTotal / objectsTotal;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString = play.passed ? '' : `(${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
#　${title} [${diffname}] ${modsPlusSign}${modsString}
${sr}★　${grade}${mapCompletionString}　${comboString}　${acc}%
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

  createNoRecentPlaysMessage(
    server: OsuServer,
    passesOnly: boolean,
    username: string
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const serverPrefix = SERVERS.getPrefixByServer(server);
    const recentPlaysPrefix = UserRecentPlays.recentPlaysPrefixes[0];
    const text = `
[Server: ${serverString}]
Нет последних ${passesOnly ? 'пассов' : 'скоров'}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: passesOnly
        ? [
            [
              {
                text: `Последние скоры ${username}`,
                command: `${serverPrefix} ${recentPlaysPrefix} ${username}`,
              },
            ],
          ]
        : undefined,
    };
  }
}

interface UserRecentPlaysExecutionArgs {
  vkUserId: number;
  server: OsuServer;
  passesOnly: boolean;
  username: string | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
  mods: string[] | undefined;
}

interface UserRecentPlaysViewParams {
  server: OsuServer;
  passesOnly: boolean;
  usernameInput: string | undefined;
  recentPlays: OsuUserRecentPlays | undefined;
}

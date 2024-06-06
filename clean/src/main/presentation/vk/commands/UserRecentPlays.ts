/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
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
  RecentPlayStatisticsCtb,
  RecentPlayStatisticsMania,
  RecentPlayStatisticsOsu,
  RecentPlayStatisticsTaiko,
  SettingsDA,
  SettingsDT,
  SettingsDefaults,
  SettingsHT,
} from '../../../domain/usecases/get_recent_plays/GetRecentPlaysResponse';
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
import {sumBy} from '../../../../primitives/Arrays';

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

  private COMMAND_PREFIX = new OWN_COMMAND_PREFIX(this.prefixes);
  commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MODS, isOptional: true},
    {argument: MODE, isOptional: true},
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
    // eslint-disable-next-line prettier/prettier
    const commandPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const startPosition = argsProcessor.use(START_POSITION).extract();
    const quantity = argsProcessor.use(QUANTITY).extract();
    const mods = argsProcessor.use(MODS).extract();
    const mode = argsProcessor.use(MODE).extract();
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
      mode: mode,
    });
  }

  async process(
    args: UserRecentPlaysExecutionArgs
  ): Promise<UserRecentPlaysViewParams> {
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
          passesOnly: args.passesOnly,
          usernameInput: undefined,
          recentPlays: undefined,
        };
      }
      username = boundUser.username;
      mode ??= boundUser.ruleset;
    }
    const mods = args.mods ?? [];
    const startPosition = clamp(args.startPosition ?? 1, 1, 100);
    const quantity = clamp(args.quantity ?? 1, 1, 10);
    const recentPlaysResult = await this.getRecentPlays.execute({
      appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
      server: args.server,
      username: username,
      ruleset: mode,
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
            mode: mode,
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
      mode: recentPlaysResult.ruleset!,
      passesOnly: args.passesOnly,
      usernameInput: args.username,
      recentPlays: recentPlaysResult.recentPlays!,
    };
  }

  createOutputMessage(params: UserRecentPlaysViewParams): VkOutputMessage {
    const {server, mode, passesOnly, recentPlays} = params;
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
      return this.createNoRecentPlaysMessage(
        server,
        mode!,
        passesOnly,
        username
      );
    }
    return this.createRecentPlaysMessage(
      recentPlays,
      server,
      mode!,
      passesOnly
    );
  }

  createRecentPlaysMessage(
    recentPlays: OsuUserRecentPlays,
    server: OsuServer,
    mode: OsuRuleset,
    passesOnly: boolean
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const oneScore = recentPlays.plays.length === 1;
    const passesString = oneScore ? 'Последний пасс' : 'Последние пассы';
    const scoresString = oneScore ? 'Последний скор' : 'Последние скоры';
    const username = recentPlays.username;
    const scoresText = recentPlays.plays
      .map((p, i) =>
        oneScore
          ? this.verboseScoreDescription(p, mode)
          : this.shortScoreDescription(p, mode, i)
      )
      .join('\n\n');
    const couldNotGetSomeStatsMessage =
      recentPlays.plays.find(play =>
        [play.stars, play.beatmap.maxCombo].includes(undefined)
      ) !== undefined
        ? '\n(Не удалось получить часть статистики)'
        : '';
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
${passesOnly ? passesString : scoresString} ${username}

${scoresText}
${couldNotGetSomeStatsMessage}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  verboseScoreDescription(play: RecentPlay, mode: OsuRuleset): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym === 'DT');
    if (dtMod !== undefined) {
      speed =
        (dtMod.settings as SettingsDT)?.speed_change ??
        SettingsDefaults.DT.speed_change!;
    }
    const htMod = play.mods.find(m => m.acronym === 'HT');
    if (htMod !== undefined) {
      speed =
        (htMod.settings as SettingsHT)?.speed_change ??
        SettingsDefaults.HT.speed_change!;
    }
    let arAsterisk = '';
    let csAsterisk = '';
    let odAsterisk = '';
    let hpAsterisk = '';
    const daMod = play.mods.find(m => m.acronym === 'DA');
    if (daMod !== undefined && daMod.settings !== undefined) {
      const daSettings = daMod.settings as SettingsDA;
      if (daSettings.approach_rate !== undefined) {
        arAsterisk = '*';
      }
      if (daSettings.circle_size !== undefined) {
        csAsterisk = '*';
      }
      if (daSettings.overall_difficulty !== undefined) {
        odAsterisk = '*';
      }
      if (daSettings.drain_rate !== undefined) {
        hpAsterisk = '*';
      }
    }

    const mapStatus = mapset.status;
    const {artist, title} = mapset;
    const diffname = map.difficultyName;
    const mapperName = mapset.creator;
    let lengthString: string;
    let drainString: string;
    {
      const totalLength = new Timespan().addSeconds(map.totalLength / speed);
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(map.drainLength / speed);
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
    }
    const bpm = round(map.bpm * speed, 2);
    const sr = play.stars?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.join('');
    const defaultSpeeds = [
      1,
      SettingsDefaults.DT.speed_change,
      SettingsDefaults.HT.speed_change,
    ];
    if (!defaultSpeeds.includes(speed)) {
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
    const max_combo = getMapMaxCombo(play, mode) ?? '—';
    const comboString = `${combo}x/${max_combo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const pp = play.pp.value?.toFixed(2) ?? '—';
    const ppFc = play.pp.ifFc?.toFixed(2) ?? '—';
    const ppSs = play.pp.ifSs?.toFixed(2) ?? '—';
    const ppForFcAndSsString = [play.pp.ifFc, play.pp.ifSs].includes(undefined)
      ? ''
      : `　⯈ FC: ${ppFc}　⯈ SS: ${ppSs}`;
    const hitcounts = getHitcounts(play, mode);
    const hitcountsString = hitcounts.join('/');
    const {grade} = play;
    const mapProgress = getMapCompletion(play, mode) ?? NaN;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString =
      play.passed || isNaN(mapProgress) ? '' : `(${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
<${mapStatus}> ${artist} - ${title} [${diffname}] by ${mapperName}
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsPlusSign}${modsString}
AR: ${ar}${arAsterisk}　CS: ${cs}${csAsterisk}　OD: ${od}${odAsterisk}　HP: ${hp}${hpAsterisk}

Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${pp}${ppForFcAndSsString}
Hitcounts: ${hitcountsString}
Grade: ${grade} ${mapCompletionString}

Beatmap: ${mapUrlShort}
    `.trim();
  }

  shortScoreDescription(
    play: RecentPlay,
    mode: OsuRuleset,
    index: number
  ): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym === 'DT');
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed =
        (dtMod.settings as SettingsDT).speed_change ??
        SettingsDefaults.DT.speed_change!;
    }
    const htMod = play.mods.find(m => m.acronym === 'HT');
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed =
        (htMod.settings as SettingsHT).speed_change ??
        SettingsDefaults.HT.speed_change!;
    }

    const relPos = index + 1;
    const absPos = play.absolutePosition;
    const maybeAbsPos = absPos === relPos ? '' : `\\${absPos}`;
    const {title} = mapset;
    const diffname = map.difficultyName;
    const sr = play.stars?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.join('');
    const defaultSpeeds = [
      1,
      SettingsDefaults.DT.speed_change,
      SettingsDefaults.HT.speed_change,
    ];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const combo = play.combo;
    const max_combo = getMapMaxCombo(play, mode) ?? '—';
    const comboString = `${combo}x/${max_combo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const pp = play.pp.value?.toFixed(2) ?? '—';
    const {grade} = play;
    const mapProgress = getMapCompletion(play, mode) ?? NaN;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString =
      play.passed || isNaN(mapProgress) ? '' : `(${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${relPos}${maybeAbsPos}. ${title} [${diffname}] ${modsPlusSign}${modsString}
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
    mode: OsuRuleset,
    passesOnly: boolean,
    username: string
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const serverPrefix = SERVERS.getPrefixByServer(server);
    const recentPlaysPrefix = UserRecentPlays.recentPlaysPrefixes[0];
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
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
                command: `${serverPrefix} ${recentPlaysPrefix} ${username} mode=${modeString}`,
              },
            ],
          ]
        : undefined,
    };
  }
}

type UserRecentPlaysExecutionArgs = {
  vkUserId: number;
  server: OsuServer;
  passesOnly: boolean;
  username: string | undefined;
  startPosition: number | undefined;
  quantity: number | undefined;
  mods: ModArg[] | undefined;
  mode: OsuRuleset | undefined;
};

type UserRecentPlaysViewParams = {
  server: OsuServer;
  mode: OsuRuleset | undefined;
  passesOnly: boolean;
  usernameInput: string | undefined;
  recentPlays: OsuUserRecentPlays | undefined;
};

function getHitcounts(play: RecentPlay, mode: OsuRuleset): number[] {
  let counts: number[];
  if (mode === OsuRuleset.osu) {
    const statistics = play.statistics as RecentPlayStatisticsOsu;
    counts = [
      statistics.countGreat,
      statistics.countOk,
      statistics.countMeh,
      statistics.countMiss,
    ];
  } else if (mode === OsuRuleset.taiko) {
    const statistics = play.statistics as RecentPlayStatisticsTaiko;
    counts = [statistics.countGreat, statistics.countOk, statistics.countMiss];
  } else if (mode === OsuRuleset.ctb) {
    const statistics = play.statistics as RecentPlayStatisticsCtb;
    counts = [
      statistics.countGreat,
      statistics.countLargeTickHit,
      statistics.countSmallTickHit,
      statistics.countSmallTickMiss,
      statistics.countMiss,
    ];
  } else if (mode === OsuRuleset.mania) {
    const statistics = play.statistics as RecentPlayStatisticsMania;
    counts = [
      statistics.countPerfect,
      statistics.countGreat,
      statistics.countGood,
      statistics.countOk,
      statistics.countMeh,
      statistics.countMiss,
    ];
  } else {
    throw Error('Unknown game mode');
  }
  return counts;
}

function getMapMaxCombo(
  play: RecentPlay,
  mode: OsuRuleset
): number | undefined {
  // It is most likely possible to calculate max combo for every play.
  // But since we get different fields for scores set on stable client
  // than for scores set on lazer client (might want check if this is still true)
  // combined with the fact that api is not stable and is not well documented
  // we will rely on simulated max combo which can be undefined if simulation api is not available.
  const maybeMaxCombo = play.beatmap.maxCombo;
  if (mode === OsuRuleset.osu) {
    return maybeMaxCombo;
  } else if (mode === OsuRuleset.taiko) {
    return maybeMaxCombo ?? play.beatmap.countCircles;
  } else if (mode === OsuRuleset.ctb) {
    return maybeMaxCombo;
  } else if (mode === OsuRuleset.mania) {
    return maybeMaxCombo;
  } else {
    throw Error('Unknown game mode');
  }
}

function getMapCompletion(
  play: RecentPlay,
  mode: OsuRuleset
): number | undefined {
  if (mode === OsuRuleset.osu) {
    const counts = play.statistics as RecentPlayStatisticsOsu;
    const map = play.beatmap;
    const hitCountsTotal =
      counts.countGreat + counts.countOk + counts.countMeh + counts.countMiss;
    const objectsTotal = map.countCircles + map.countSliders + map.countSliders;
    return hitCountsTotal / objectsTotal;
  } else if (mode === OsuRuleset.taiko) {
    const counts = play.statistics as RecentPlayStatisticsTaiko;
    const hitCountsTotal =
      counts.countGreat + counts.countOk + counts.countMiss;
    const objectsTotal = play.beatmap.countCircles;
    return hitCountsTotal / objectsTotal;
  } else if (mode === OsuRuleset.ctb) {
    if (play.beatmap.maxCombo === undefined) {
      // Not really important, better wait until api is stable and docs are good.
      return undefined;
    }
    const counts = play.statistics as RecentPlayStatisticsCtb;
    const hitCountsTotal =
      counts.countGreat + counts.countLargeTickHit + counts.countMiss;
    return hitCountsTotal / play.beatmap.maxCombo;
  } else if (mode === OsuRuleset.mania) {
    const statistics = play.statistics as RecentPlayStatisticsMania;
    const hitCountsTotal = sumBy(
      x => x,
      [
        statistics.countPerfect,
        statistics.countGreat,
        statistics.countGood,
        statistics.countOk,
        statistics.countMeh,
        statistics.countMiss,
      ]
    );
    const objectsTotal = play.beatmap.countCircles + play.beatmap.countSliders;
    return hitCountsTotal / objectsTotal;
  } else {
    throw Error('Unknown game mode');
  }
}

/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {GetUserRecentPlaysUseCase} from '../../../application/usecases/get_user_recent_plays/GetUserRecentPlaysUseCase';
import {OsuServer} from '../../../../primitives/OsuServer';
import {APP_CODE_NAME} from '../../../App';
import {SERVERS} from '../../common/OsuServers';
import {GetAppUserInfoUseCase} from '../../../application/usecases/get_app_user_info/GetAppUserInfoUseCase';
import {VkIdConverter} from '../VkIdConverter';
import {clamp, round} from '../../../../primitives/Numbers';
import {
  OsuUserRecentPlays,
  OsuUserRecentPlay,
  SettingsDA,
  SettingsDT,
  SettingsDefaults,
  SettingsHT,
} from '../../../application/usecases/get_user_recent_plays/GetUserRecentPlaysResponse';
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

  static recentPlaysPrefixes = new CommandPrefixes('r', 'Recent');
  static recentPassesPrefixes = new CommandPrefixes('rp', 'RecentPass');
  static prefixes = new CommandPrefixes(
    ...UserRecentPlays.recentPlaysPrefixes,
    ...UserRecentPlays.recentPassesPrefixes
  );
  prefixes = UserRecentPlays.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = UserRecentPlays.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: USERNAME, isOptional: true},
    {argument: START_POSITION, isOptional: true},
    {argument: QUANTITY, isOptional: true},
    {argument: MODS, isOptional: true},
    {argument: MODE, isOptional: true},
  ];

  getRecentPlays: GetUserRecentPlaysUseCase;
  getAppUserInfo: GetAppUserInfoUseCase;
  constructor(
    getRecentPlays: GetUserRecentPlaysUseCase,
    getAppUserInfo: GetAppUserInfoUseCase
  ) {
    super(UserRecentPlays.commandStructure);
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
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
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
    if (server === undefined || ownPrefix === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      vkUserId: ctx.senderId,
      server: server,
      passesOnly: UserRecentPlays.recentPassesPrefixes.includes(ownPrefix),
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
      .map(p =>
        oneScore
          ? this.verboseScoreDescription(p)
          : this.shortScoreDescription(p)
      )
      .join('\n\n');
    const couldNotGetSomeStatsMessage =
      recentPlays.plays.find(
        play => play.beatmap.estimatedStarRating === undefined
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

  verboseScoreDescription(play: OsuUserRecentPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.is('DT'));
    if (dtMod !== undefined) {
      speed =
        (dtMod.settings as SettingsDT)?.speedChange ??
        SettingsDefaults.DT.speedChange!;
    }
    const htMod = play.mods.find(m => m.acronym.is('HT'));
    if (htMod !== undefined) {
      speed =
        (htMod.settings as SettingsHT)?.speedChange ??
        SettingsDefaults.HT.speedChange!;
    }
    const [arAsterisk, csAsterisk, odAsterisk, hpAsterisk] = (() => {
      const daMod = play.mods.find(m => m.acronym.is('DA'));
      const settings = daMod?.settings as SettingsDA | undefined;
      return [
        settings?.ar === undefined ? '' : '*',
        settings?.cs === undefined ? '' : '*',
        settings?.od === undefined ? '' : '*',
        settings?.hp === undefined ? '' : '*',
      ];
    })();

    const absPos = `\\${play.absolutePosition}`;
    const {artist, title} = mapset;
    const diffname = map.difficultyName;
    const mapperName = mapset.creator;
    const mapStatus = mapset.status;
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
    let modsString = modAcronyms.join('');
    const defaultSpeeds = [
      1,
      SettingsDefaults.DT.speedChange,
      SettingsDefaults.HT.speedChange,
    ];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
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
    const max_combo = play.beatmap.maxCombo;
    const comboString = `${combo}x/${max_combo}x`;
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
    const hitcounts = play.orderedHitcounts;
    const hitcountsString = hitcounts.join('/');
    const {grade} = play;
    const mapProgress = play.mapProgress;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString = play.passed ? '' : ` (${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${absPos}. ${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsPlusSign}${modsString}
AR: ${ar}${arAsterisk}　CS: ${cs}${csAsterisk}　OD: ${od}${odAsterisk}　HP: ${hp}${hpAsterisk}

Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${ppEstimationMark}${pp}${ppForFcAndSsString}
Hitcounts: ${hitcountsString}
Grade: ${grade}${mapCompletionString}

Beatmap: ${mapUrlShort}
    `.trim();
  }

  shortScoreDescription(play: OsuUserRecentPlay): string {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed =
        (dtMod.settings as SettingsDT).speedChange ??
        SettingsDefaults.DT.speedChange;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed =
        (htMod.settings as SettingsHT).speedChange ??
        SettingsDefaults.HT.speedChange;
    }

    const absPos = `\\${play.absolutePosition}`;
    const {title} = mapset;
    const diffname = map.difficultyName;
    const sr = play.beatmap.estimatedStarRating?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.join('');
    const defaultSpeeds = [
      1,
      SettingsDefaults.DT.speedChange,
      SettingsDefaults.HT.speedChange,
    ];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const combo = play.combo;
    const max_combo = play.beatmap.maxCombo;
    const comboString = `${combo}x/${max_combo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(2);
    const ppValueEstimation = play.pp.estimatedValue?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    const {grade} = play;
    const mapProgress = play.mapProgress;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString = play.passed ? '' : ` (${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${absPos}. ${title} [${diffname}] ${modsPlusSign}${modsString}
${sr}★　${grade}${mapCompletionString}　${comboString}　${acc}%
${ppEstimationMark}${pp}pp　 ${mapUrlShort}
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

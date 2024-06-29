/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {OsuServer} from '../../../../primitives/OsuServer';
import {GetBeatmapInfoUseCase} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {APP_CODE_NAME} from '../../../App';
import {VkIdConverter} from '../VkIdConverter';
import {
  ACCURACY,
  DIFFICULTY_ADJUST_SETTING,
  FIFTYCOUNT,
  HUNDREDCOUNT,
  MISSCOUNT,
  MODS,
  OWN_COMMAND_PREFIX,
  SCORE_COMBO,
  SERVER_PREFIX,
  SPEED_RATE,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {NUMBER} from '../../common/arg_processing/CommandArguments';
import {MapInfo} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {Timespan} from '../../../../primitives/Timespan';
import {integerShortForm, round} from '../../../../primitives/Numbers';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export class BeatmapInfo extends VkCommand<
  BeatmapInfoExecutionArgs,
  BeatmapInfoViewParams
> {
  internalName = BeatmapInfo.name;
  shortDescription = 'показать карту';
  longDescription = 'Отображает основную информацию о карте';

  static prefixes = new CommandPrefixes('m', 'map');
  prefixes = BeatmapInfo.prefixes;

  private static COMMAND_PREFIX = new OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = BeatmapInfo.COMMAND_PREFIX;
  private static BEATMAP_ID = NUMBER('ID карты', 0, 1e9);
  private BEATMAP_ID = BeatmapInfo.BEATMAP_ID;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false}, // 0
    {argument: this.COMMAND_PREFIX, isOptional: false}, // 1
    {argument: this.BEATMAP_ID, isOptional: true}, // 2

    {argument: MODS, isOptional: true}, // 3
    {argument: SCORE_COMBO, isOptional: true}, // 4
    {argument: MISSCOUNT, isOptional: true}, // 5
    {argument: ACCURACY, isOptional: true}, // 6
    {argument: FIFTYCOUNT, isOptional: true}, // 7
    {argument: HUNDREDCOUNT, isOptional: true}, // 8
    {argument: SPEED_RATE, isOptional: true}, // 9
    {argument: DIFFICULTY_ADJUST_SETTING, isOptional: true}, // 10
  ];
  argGroups = {
    osu: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    taiko: [0, 1, 2],
    ctb: [0, 1, 2],
    mania: [0, 1, 2],
  };

  getBeatmapInfo: GetBeatmapInfoUseCase;
  constructor(getBeatmapInfo: GetBeatmapInfoUseCase) {
    super(BeatmapInfo.commandStructure);
    this.getBeatmapInfo = getBeatmapInfo;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<BeatmapInfoExecutionArgs> {
    const fail = CommandMatchResult.fail<BeatmapInfoExecutionArgs>();
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
    const commandPrefix = argsProcessor
      .use(this.COMMAND_PREFIX)
      .at(0)
      .extract();
    const beatmapId = argsProcessor.use(this.BEATMAP_ID).extract();
    const mods = argsProcessor.use(MODS).extract();
    const scoreCombo = argsProcessor.use(SCORE_COMBO).extract();
    const misscount = argsProcessor.use(MISSCOUNT).extract();
    const accuracy = argsProcessor.use(ACCURACY).extract();
    const fiftycount = argsProcessor.use(FIFTYCOUNT).extract();
    const hundredcount = argsProcessor.use(HUNDREDCOUNT).extract();
    const speedRate = argsProcessor.use(SPEED_RATE).extract();
    let daSettings = argsProcessor.use(DIFFICULTY_ADJUST_SETTING).extract();
    let oneSetting = argsProcessor.use(DIFFICULTY_ADJUST_SETTING).extract();
    while (oneSetting !== undefined) {
      daSettings = {...daSettings, ...oneSetting};
      oneSetting = argsProcessor.use(DIFFICULTY_ADJUST_SETTING).extract();
    }
    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (
      server === undefined ||
      commandPrefix === undefined ||
      beatmapId === undefined
    ) {
      return fail;
    }
    const osuSettings: MapScoreSimulationOsu = {
      mods: mods?.map(m => m.acronym),
      combo: scoreCombo,
      misses: misscount,
      accuracy: accuracy,
      mehs: fiftycount,
      goods: hundredcount,
      speed: speedRate,
      ...daSettings,
    };
    return CommandMatchResult.ok({
      server: server,
      beatmapId: beatmapId,
      mapScoreSimulationOsu: osuSettings,
      vkUserId: ctx.senderId,
    });
  }

  async process(
    args: BeatmapInfoExecutionArgs
  ): Promise<BeatmapInfoViewParams> {
    const beatmapInfoResponse = await this.getBeatmapInfo.execute({
      appUserId: VkIdConverter.vkUserIdToAppUserId(args.vkUserId),
      beatmapId: args.beatmapId,
      server: args.server,
      mapScoreSimulationOsu: args.mapScoreSimulationOsu,
    });
    const beatmapInfo = beatmapInfoResponse.beatmapInfo;
    return {
      server: args.server,
      beatmapIdInput: args.beatmapId,
      beatmapInfo: beatmapInfo,
    };
  }

  createOutputMessage(params: BeatmapInfoViewParams): VkOutputMessage {
    const {server, beatmapIdInput, beatmapInfo} = params;
    if (beatmapInfo === undefined) {
      if (beatmapIdInput === undefined) {
        return this.createMapIdNotSpecifiedMessage(server);
      }
      return this.createMapNotFoundMessage(server, beatmapIdInput);
    }
    if (beatmapInfo.simulationParams !== undefined) {
      return this.createSimulatedScoreInfoMessage(server, beatmapInfo);
    }
    return this.createMapInfoMessage(server, beatmapInfo);
  }

  createMapInfoMessage(server: OsuServer, mapInfo: MapInfo) {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mapInfo.mode];
    const {artist, title} = mapInfo.beatmapset;
    const diffname = mapInfo.version;
    const mapperName = mapInfo.beatmapset.creator;
    const mapStatus = mapInfo.beatmapset.status;
    const [lengthString, drainString] = (() => {
      const totalLength = new Timespan().addSeconds(mapInfo.totalLength);
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(mapInfo.hitLength);
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
      return [lengthString, drainString];
    })();
    const bpm = round(mapInfo.bpm, 2);
    const sr = mapInfo.starRating.toFixed(2);
    const {ar, cs, od, hp} = mapInfo;
    const mapPlaycount = integerShortForm(mapInfo.playcount);
    const totalPlaycount = integerShortForm(mapInfo.beatmapset.playcount);
    const totalFavcount = integerShortForm(mapInfo.beatmapset.favouriteCount);
    const ppEstimations = mapInfo.ppEstimations
      .map(x => {
        const acc = round(x.accuracy, 2);
        const pp = x.ppValue?.toFixed(0);
        const ppString = pp === undefined ? '—' : `~${pp}pp`;
        return `${acc}%: ${ppString}`;
      })
      .join('　');
    const mapUrlShort = mapInfo.url.replace('beatmaps', 'b');
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
▷ ${totalPlaycount} [${mapPlaycount}]　♡ ${totalFavcount}

${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
${ppEstimations}

URL: ${mapUrlShort}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: [],
    };
  }

  createSimulatedScoreInfoMessage(server: OsuServer, mapInfo: MapInfo) {
    if (mapInfo.simulationParams === undefined) {
      throw Error('Simulated stats should not be undefined');
    }
    const simulatedStats = mapInfo.simulationParams;
    let speed = 1;
    const htLike = simulatedStats.mods.find(m => m.isAnyOf('HT', 'DC'));
    if (htLike !== undefined) {
      if (simulatedStats.speed !== undefined) {
        speed = simulatedStats.speed;
      } else {
        speed = 0.75;
      }
    }
    const dtLike = simulatedStats.mods.find(m => m.isAnyOf('DT', 'NC'));
    if (dtLike !== undefined) {
      if (simulatedStats.speed !== undefined) {
        speed = simulatedStats.speed;
      } else {
        speed = 1.5;
      }
    }
    const speedString = [1, 0.75, 1.5].includes(speed)
      ? ''
      : ` (${round(speed, 2)}x)`;
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mapInfo.mode];
    const {artist, title} = mapInfo.beatmapset;
    const diffname = mapInfo.version;
    const mapperName = mapInfo.beatmapset.creator;
    const mapStatus = mapInfo.beatmapset.status;
    const [lengthString, drainString] = (() => {
      const totalLength = new Timespan().addSeconds(
        mapInfo.totalLength / speed
      );
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(mapInfo.hitLength / speed);
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
      return [lengthString, drainString];
    })();
    const bpm = round(mapInfo.bpm * speed, 2);
    const mods = simulatedStats.mods;
    const modsString = mods.length === 0 ? '' : '+' + mods.join('');
    const sr = mapInfo.starRating.toFixed(2);
    const acc = simulatedStats.accuracy.toFixed(2);
    const {misses, mehs} = simulatedStats;
    const hitcountsString = `${misses}xMiss　${mehs}x50`;
    const comboString = `${simulatedStats.combo}x/${mapInfo.maxCombo}x`;
    const ar = round(mapInfo.ar, 2);
    const cs = round(mapInfo.cs, 2);
    const od = round(mapInfo.od, 2);
    const hp = round(mapInfo.hp, 2);
    const mapPlaycount = integerShortForm(mapInfo.playcount);
    const totalPlaycount = integerShortForm(mapInfo.beatmapset.playcount);
    const totalFavcount = integerShortForm(mapInfo.beatmapset.favouriteCount);
    const ppEstimation = mapInfo.ppEstimations.map(x => {
      const pp = x.ppValue?.toFixed(0);
      const ppString = pp === undefined ? '—' : `~${pp}pp`;
      return `${ppString}`;
    })[0];
    const mapUrlShort = mapInfo.url.replace('beatmaps', 'b');
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
▷ ${totalPlaycount} [${mapPlaycount}]　♡ ${totalFavcount}

${modsString}${speedString}
${acc}%　${hitcountsString}　${comboString}
${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
${ppEstimation}

URL: ${mapUrlShort}
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: [],
    };
  }

  createMapNotFoundMessage(
    server: OsuServer,
    beatmapIdInput: number
  ): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Карта ${beatmapIdInput} не найдена
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createMapIdNotSpecifiedMessage(server: OsuServer): VkOutputMessage {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не указан ID!
    `.trim();
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }
}

type BeatmapInfoExecutionArgs = {
  server: OsuServer;
  beatmapId: number;
  mapScoreSimulationOsu: MapScoreSimulationOsu;
  vkUserId: number;
};

type BeatmapInfoViewParams = {
  server: OsuServer;
  beatmapIdInput: number;
  beatmapInfo: MapInfo | undefined;
};

type MapScoreSimulationOsu = {
  mods?: ModAcronym[];
  combo?: number;
  misses?: number;
  accuracy?: number;
  mehs?: number;
  goods?: number;
  speed?: number;
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
};

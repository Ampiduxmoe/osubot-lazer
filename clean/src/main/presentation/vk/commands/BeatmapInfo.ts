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
  OWN_COMMAND_PREFIX,
  SERVER_PREFIX,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {OsuRuleset} from '../../../../primitives/OsuRuleset';
import {NUMBER} from '../../common/arg_processing/CommandArguments';
import {MapInfo} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {Timespan} from '../../../../primitives/Timespan';

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
    {argument: SERVER_PREFIX, isOptional: false},
    {argument: this.COMMAND_PREFIX, isOptional: false},
    {argument: this.BEATMAP_ID, isOptional: true},
  ];

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
    if (!this.prefixes.matchIgnoringCase(commandPrefix)) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: server,
      beatmapId: beatmapId,
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
    const {bpm} = mapInfo;
    const sr = mapInfo.starRating;
    const {ar, cs, od, hp} = mapInfo;
    const {playcount} = mapInfo;
    const favcount = mapInfo.beatmapset.favouriteCount;
    const mapUrlShort = mapInfo.url.replace('beatmaps', 'b');
    const text = `
[Server: ${serverString}]
Mode: ${modeString}
${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})

${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
▷ ${playcount}　♡ ${favcount}

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
  vkUserId: number;
};

type BeatmapInfoViewParams = {
  server: OsuServer;
  beatmapIdInput: number;
  beatmapInfo: MapInfo | undefined;
};

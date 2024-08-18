import {MapInfo} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {GetBeatmapInfoUseCase} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ModAcronym} from '../../primitives/ModAcronym';
import {OsuServer} from '../../primitives/OsuServer';
import {
  ACCURACY,
  BEATMAP_ID,
  DIFFICULTY_ADJUST_SETTING,
  FIFTYCOUNT,
  HUNDREDCOUNT,
  MISSCOUNT,
  MODS,
  OWN_COMMAND_PREFIX,
  SCORE_COMBO,
  SERVER_PREFIX,
  SPEED_RATE,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {TextCommand} from './base/TextCommand';
import {
  GetContextualBeatmapIds,
  GetInitiatorAppUserId,
  GetLastSeenBeatmapId,
  SaveLastSeenBeatmapId,
} from './common/Signatures';

export abstract class BeatmapInfo<TContext, TOutput> extends TextCommand<
  BeatmapInfoExecutionArgs,
  BeatmapInfoViewParams,
  TContext,
  TOutput
> {
  internalName = BeatmapInfo.name;
  shortDescription = 'показать карту';
  longDescription = 'Отображает основную информацию о карте';
  notices = [];

  static prefixes = new CommandPrefixes('m', 'Map');
  prefixes = BeatmapInfo.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = BeatmapInfo.COMMAND_PREFIX;
  private static commandStructure = [
    {argument: SERVER_PREFIX, isOptional: false}, // 0
    {argument: this.COMMAND_PREFIX, isOptional: false}, // 1
    {argument: BEATMAP_ID, isOptional: true}, // 2

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
    osu: {
      description:
        this.longDescription +
        ' и показывает результаты симуляции гипотетического скора, ' +
        'если были выбраны дополнительные параметры',
      memberIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    taiko: {
      description: this.longDescription,
      memberIndices: [0, 1, 2],
    },
    ctb: {
      description: this.longDescription,
      memberIndices: [0, 1, 2],
    },
    mania: {
      description: this.longDescription,
      memberIndices: [0, 1, 2],
    },
  };

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getContextualBeatmapIds: GetContextualBeatmapIds<TContext>,
    protected getLastSeenBeatmapId: GetLastSeenBeatmapId<TContext>,
    protected saveLastSeenBeatmapId: SaveLastSeenBeatmapId<TContext>,
    protected getBeatmapInfo: GetBeatmapInfoUseCase
  ) {
    super(BeatmapInfo.commandStructure);
  }

  matchText(text: string): CommandMatchResult<BeatmapInfoExecutionArgs> {
    const fail = CommandMatchResult.fail<BeatmapInfoExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
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
    const osuSettings: MapScoreSimulationOsu = {
      mods: mods,
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
    });
  }

  process(
    args: BeatmapInfoExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<BeatmapInfoViewParams> {
    const valuePromise: Promise<BeatmapInfoViewParams> = (async () => {
      const beatmapId: number | undefined = await (async () => {
        if (args.beatmapId !== undefined) {
          return args.beatmapId;
        }
        const closestIds = this.getContextualBeatmapIds(ctx);
        if (closestIds.length === 1) {
          return closestIds[0].id;
        }
        return await this.getLastSeenBeatmapId(ctx, args.server);
      })();
      if (beatmapId === undefined) {
        return {
          server: args.server,
          beatmapIdInput: undefined,
          beatmapInfo: undefined,
        };
      }
      const beatmapInfoResponse = await this.getBeatmapInfo.execute({
        initiatorAppUserId: this.getInitiatorAppUserId(ctx),
        beatmapId: beatmapId,
        server: args.server,
        mapScoreSimulationOsu: args.mapScoreSimulationOsu,
      });
      const beatmapInfo = beatmapInfoResponse.beatmapInfo;
      if (beatmapInfo === undefined) {
        return {
          server: args.server,
          beatmapIdInput: args.beatmapId,
          beatmapInfo: undefined,
        };
      }
      if (beatmapId !== undefined) {
        await this.saveLastSeenBeatmapId(ctx, args.server, beatmapId);
      }
      return {
        server: args.server,
        beatmapIdInput: args.beatmapId,
        beatmapInfo: beatmapInfo,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createOutputMessage(params: BeatmapInfoViewParams): MaybeDeferred<TOutput> {
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

  abstract createMapInfoMessage(
    server: OsuServer,
    mapInfo: MapInfo
  ): MaybeDeferred<TOutput>;
  abstract createSimulatedScoreInfoMessage(
    server: OsuServer,
    mapInfo: MapInfo
  ): MaybeDeferred<TOutput>;
  abstract createMapNotFoundMessage(
    server: OsuServer,
    beatmapIdInput: number
  ): MaybeDeferred<TOutput>;
  abstract createMapIdNotSpecifiedMessage(
    server: OsuServer
  ): MaybeDeferred<TOutput>;

  unparse(args: BeatmapInfoExecutionArgs): string {
    const tokens = [
      SERVER_PREFIX.unparse(args.server),
      this.COMMAND_PREFIX.unparse(this.prefixes[0]),
    ];
    if (args.beatmapId !== undefined) {
      tokens.push(BEATMAP_ID.unparse(args.beatmapId));
    }
    const simulationOsu = args.mapScoreSimulationOsu;
    if (simulationOsu.mods !== undefined) {
      tokens.push(MODS.unparse(simulationOsu.mods));
    }
    if (simulationOsu.combo !== undefined) {
      tokens.push(SCORE_COMBO.unparse(simulationOsu.combo));
    }
    if (simulationOsu.misses !== undefined) {
      tokens.push(MISSCOUNT.unparse(simulationOsu.misses));
    }
    if (simulationOsu.accuracy !== undefined) {
      tokens.push(ACCURACY.unparse(simulationOsu.accuracy));
    }
    if (simulationOsu.mehs !== undefined) {
      tokens.push(FIFTYCOUNT.unparse(simulationOsu.mehs));
    }
    if (simulationOsu.goods !== undefined) {
      tokens.push(HUNDREDCOUNT.unparse(simulationOsu.goods));
    }
    if (simulationOsu.speed !== undefined) {
      tokens.push(SPEED_RATE.unparse(simulationOsu.speed));
    }
    const da = simulationOsu;
    if ((da.ar || da.cs || da.od || da.hp) !== undefined) {
      tokens.push(...DIFFICULTY_ADJUST_SETTING.unparse(da).split(' '));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type BeatmapInfoExecutionArgs = {
  server: OsuServer;
  beatmapId: number | undefined;
  mapScoreSimulationOsu: MapScoreSimulationOsu;
};

export type BeatmapInfoViewParams = {
  server: OsuServer;
  beatmapIdInput: number | undefined;
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

import {MapInfo} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {GetBeatmapInfoUseCase} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {ModAcronym} from '../../primitives/ModAcronym';
import {OsuServer} from '../../primitives/OsuServer';
import {CommandArgument} from '../common/arg_processing/CommandArgument';
import {
  ACCURACY,
  ArgDA,
  BEATMAP_ID,
  DIFFICULTY_ADJUST_SETTING,
  FIFTYCOUNT,
  HUNDREDCOUNT,
  HUNDREDFIFTYCOUNT,
  MISSCOUNT,
  MODS,
  OWN_COMMAND_PREFIX,
  SCORE_COMBO,
  SERVER_PREFIX,
  SMALLMISSCOUNT,
  SPEED_RATE,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {
  CommandMatchResult,
  TokenMatchEntry,
} from '../common/CommandMatchResult';
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
  private static DA_SETTING_OSU = DIFFICULTY_ADJUST_SETTING(
    'ar',
    'cs',
    'hp',
    'od'
  );
  private DA_SETTING_OSU = BeatmapInfo.DA_SETTING_OSU;
  private static DA_SETTING_TAIKO = DIFFICULTY_ADJUST_SETTING('hp', 'od');
  private DA_SETTING_TAIKO = BeatmapInfo.DA_SETTING_TAIKO;
  private static DA_SETTING_CTB = DIFFICULTY_ADJUST_SETTING('ar', 'cs', 'hp');
  private DA_SETTING_CTB = BeatmapInfo.DA_SETTING_CTB;
  private static DA_SETTING_MANIA = DIFFICULTY_ADJUST_SETTING('od', 'hp');
  private DA_SETTING_MANIA = BeatmapInfo.DA_SETTING_MANIA;
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
    {argument: this.DA_SETTING_OSU, isOptional: true}, // 10

    {argument: HUNDREDFIFTYCOUNT, isOptional: true}, // 11
    {argument: this.DA_SETTING_TAIKO, isOptional: true}, // 12

    {argument: SMALLMISSCOUNT, isOptional: true}, // 13
    {argument: this.DA_SETTING_CTB, isOptional: true}, // 14

    {argument: this.DA_SETTING_MANIA, isOptional: true}, // 14
  ];
  argGroups = {
    osu: {
      isCompeting: false,
      description:
        this.longDescription +
        ' и показывает результаты симуляции гипотетического скора, ' +
        'если были выбраны дополнительные параметры',
      notices: [],
      memberIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    taiko: {
      isCompeting: false,
      description:
        this.longDescription +
        ' и показывает результаты симуляции гипотетического скора, ' +
        'если были выбраны дополнительные параметры',
      notices: [],
      memberIndices: [0, 1, 2, 3, 4, 5, 6, 11, 9, 12],
    },
    ctb: {
      isCompeting: false,
      description:
        this.longDescription +
        ' и показывает результаты симуляции гипотетического скора, ' +
        'если были выбраны дополнительные параметры',
      notices: [],
      memberIndices: [0, 1, 2, 3, 4, 5, 6, 13, 9, 14],
    },
    mania: {
      isCompeting: false,
      description:
        this.longDescription +
        ' и показывает результаты симуляции гипотетического скора, ' +
        'если были выбраны дополнительные параметры',
      notices: [],
      memberIndices: [0, 1, 2, 3, 5, 6, 9, 15],
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
    const serverRes = argsProcessor.use(SERVER_PREFIX).at(0).extractWithToken();
    const ownPrefixRes = argsProcessor
      .use(this.COMMAND_PREFIX)
      .at(0)
      .extractWithToken();
    if (serverRes[0] === undefined || ownPrefixRes[0] === undefined) {
      return fail;
    }
    const beatmapIdRes = argsProcessor.use(BEATMAP_ID).extractWithToken();
    const modsRes = argsProcessor.use(MODS).extractWithToken();
    const scoreComboRes = argsProcessor.use(SCORE_COMBO).extractWithToken();
    const misscountRes = argsProcessor.use(MISSCOUNT).extractWithToken();
    const accuracyRes = argsProcessor.use(ACCURACY).extractWithToken();
    const fiftycountRes = argsProcessor.use(FIFTYCOUNT).extractWithToken();
    const hundredcountRes = argsProcessor.use(HUNDREDCOUNT).extractWithToken();
    const hundredfiftycountRes = argsProcessor
      .use(HUNDREDFIFTYCOUNT)
      .extractWithToken();
    const smallmisscountRes = argsProcessor
      .use(SMALLMISSCOUNT)
      .extractWithToken();
    const speedRateRes = argsProcessor.use(SPEED_RATE).extractWithToken();
    const daSettingsExtractor = argsProcessor.use(this.DA_SETTING_OSU);
    const daSettingsRes: [ArgDA, string][] = [];
    for (
      let oneSettingRes = daSettingsExtractor.extractWithToken();
      oneSettingRes[0] !== undefined;
      oneSettingRes = daSettingsExtractor.extractWithToken()
    ) {
      daSettingsRes.push(oneSettingRes as [ArgDA, string]);
    }
    if (argsProcessor.remainingTokens.length > 0) {
      let extractionResults = [
        [...serverRes, SERVER_PREFIX],
        [...ownPrefixRes, this.COMMAND_PREFIX],
        [...beatmapIdRes, BEATMAP_ID],
        [...modsRes, MODS],
        [...scoreComboRes, SCORE_COMBO],
        [...misscountRes, MISSCOUNT],
        [...accuracyRes, ACCURACY],
        [...fiftycountRes, FIFTYCOUNT],
        [...hundredcountRes, HUNDREDCOUNT],
        [...hundredfiftycountRes, HUNDREDFIFTYCOUNT],
        [...smallmisscountRes, SMALLMISSCOUNT],
        [...speedRateRes, SPEED_RATE],
        ...daSettingsRes.map(r => [...r, this.DA_SETTING_OSU]),
      ];
      const mapping: TokenMatchEntry[] = [];
      for (const originalToken of tokens) {
        const extractionResult = extractionResults.find(
          r => r[1] === originalToken
        );
        if (extractionResult !== undefined) {
          extractionResults = extractionResults.filter(
            r => r !== extractionResult
          );
        }
        mapping.push({
          token: originalToken,
          argument: extractionResult?.at(2) as
            | CommandArgument<unknown>
            | undefined,
        });
      }
      return CommandMatchResult.partial(mapping);
    }
    const server = serverRes[0];
    const beatmapId = beatmapIdRes[0];
    const mods = modsRes[0];
    const scoreCombo = scoreComboRes[0];
    const misscount = misscountRes[0];
    const accuracy = accuracyRes[0];
    const fiftycount = fiftycountRes[0];
    const hundredcount = hundredcountRes[0];
    const hundredfiftycount = hundredfiftycountRes[0];
    const smallmisscount = smallmisscountRes[0];
    const speedRate = speedRateRes[0];
    const osuSettings: MapScoreSimulationOsu = {
      mods: mods,
      combo: scoreCombo,
      misses: misscount,
      accuracy: accuracy,
      mehs: fiftycount,
      goods: hundredcount,
      speed: speedRate,
      ...daSettingsRes.reduce(
        (settings, oneRes) => ({...settings, ...oneRes[0]}),
        {}
      ),
    };
    const taikoSettings: MapScoreSimulationTaiko = {
      mods: mods,
      combo: scoreCombo,
      misses: misscount,
      accuracy: accuracy,
      goods: hundredfiftycount,
      speed: speedRate,
      ...daSettingsRes.reduce(
        (settings, oneRes) => ({...settings, ...oneRes[0]}),
        {}
      ),
    };
    const ctbSettings: MapScoreSimulationCtb = {
      mods: mods,
      combo: scoreCombo,
      misses: misscount,
      accuracy: accuracy,
      smallMisses: smallmisscount,
      speed: speedRate,
      ...daSettingsRes.reduce(
        (settings, oneRes) => ({...settings, ...oneRes[0]}),
        {}
      ),
    };
    const maniaSettings: MapScoreSimulationMania = {
      mods: mods,
      combo: scoreCombo,
      misses: misscount,
      accuracy: accuracy,
      speed: speedRate,
      ...daSettingsRes.reduce(
        (settings, oneRes) => ({...settings, ...oneRes[0]}),
        {}
      ),
    };
    return CommandMatchResult.ok({
      server: server,
      beatmapId: beatmapId,
      mapScoreSimulationOsu: osuSettings,
      mapScoreSimulationTaiko: taikoSettings,
      mapScoreSimulationCtb: ctbSettings,
      mapScoreSimulationMania: maniaSettings,
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
        mapScoreSimulationOsu: args.mapScoreSimulationOsu ?? {},
        mapScoreSimulationTaiko: args.mapScoreSimulationTaiko ?? {},
        mapScoreSimulationCtb: args.mapScoreSimulationCtb ?? {},
        mapScoreSimulationMania: args.mapScoreSimulationMania ?? {},
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
    const simOsu = args.mapScoreSimulationOsu;
    const simTaiko = args.mapScoreSimulationTaiko;
    const simCtb = args.mapScoreSimulationCtb;
    const simMania = args.mapScoreSimulationMania;
    if (simOsu !== undefined) {
      if (simOsu.mods !== undefined) {
        tokens.push(MODS.unparse(simOsu.mods));
      }
      if (simOsu.combo !== undefined) {
        tokens.push(SCORE_COMBO.unparse(simOsu.combo));
      }
      if (simOsu.misses !== undefined) {
        tokens.push(MISSCOUNT.unparse(simOsu.misses));
      }
      if (simOsu.accuracy !== undefined) {
        tokens.push(ACCURACY.unparse(simOsu.accuracy));
      }
      if (simOsu.mehs !== undefined) {
        tokens.push(FIFTYCOUNT.unparse(simOsu.mehs));
      }
      if (simOsu.goods !== undefined) {
        tokens.push(HUNDREDCOUNT.unparse(simOsu.goods));
      }
      if (simOsu.speed !== undefined) {
        tokens.push(SPEED_RATE.unparse(simOsu.speed));
      }
      const da = simOsu;
      if ((da.ar ?? da.cs ?? da.od ?? da.hp) !== undefined) {
        tokens.push(...this.DA_SETTING_OSU.unparse(da).split(' '));
      }
    } else if (simTaiko !== undefined) {
      if (simTaiko.mods !== undefined) {
        tokens.push(MODS.unparse(simTaiko.mods));
      }
      if (simTaiko.combo !== undefined) {
        tokens.push(SCORE_COMBO.unparse(simTaiko.combo));
      }
      if (simTaiko.misses !== undefined) {
        tokens.push(MISSCOUNT.unparse(simTaiko.misses));
      }
      if (simTaiko.accuracy !== undefined) {
        tokens.push(ACCURACY.unparse(simTaiko.accuracy));
      }
      if (simTaiko.goods !== undefined) {
        tokens.push(HUNDREDFIFTYCOUNT.unparse(simTaiko.goods));
      }
      if (simTaiko.speed !== undefined) {
        tokens.push(SPEED_RATE.unparse(simTaiko.speed));
      }
      const da = simTaiko;
      if ((da.od ?? da.hp) !== undefined) {
        tokens.push(...this.DA_SETTING_TAIKO.unparse(da).split(' '));
      }
    } else if (simCtb !== undefined) {
      if (simCtb.mods !== undefined) {
        tokens.push(MODS.unparse(simCtb.mods));
      }
      if (simCtb.combo !== undefined) {
        tokens.push(SCORE_COMBO.unparse(simCtb.combo));
      }
      if (simCtb.misses !== undefined) {
        tokens.push(MISSCOUNT.unparse(simCtb.misses));
      }
      if (simCtb.accuracy !== undefined) {
        tokens.push(ACCURACY.unparse(simCtb.accuracy));
      }
      if (simCtb.smallMisses !== undefined) {
        tokens.push(SMALLMISSCOUNT.unparse(simCtb.smallMisses));
      }
      if (simCtb.speed !== undefined) {
        tokens.push(SPEED_RATE.unparse(simCtb.speed));
      }
      const da = simCtb;
      if ((da.ar ?? da.cs ?? da.hp) !== undefined) {
        tokens.push(...this.DA_SETTING_CTB.unparse(da).split(' '));
      }
    } else if (simMania !== undefined) {
      if (simMania.mods !== undefined) {
        tokens.push(MODS.unparse(simMania.mods));
      }
      if (simMania.combo !== undefined) {
        tokens.push(SCORE_COMBO.unparse(simMania.combo));
      }
      if (simMania.misses !== undefined) {
        tokens.push(MISSCOUNT.unparse(simMania.misses));
      }
      if (simMania.accuracy !== undefined) {
        tokens.push(ACCURACY.unparse(simMania.accuracy));
      }
      if (simMania.speed !== undefined) {
        tokens.push(SPEED_RATE.unparse(simMania.speed));
      }
      const da = simMania;
      if ((da.od ?? da.hp) !== undefined) {
        tokens.push(...this.DA_SETTING_MANIA.unparse(da).split(' '));
      }
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type BeatmapInfoExecutionArgs = {
  server: OsuServer;
  beatmapId: number | undefined;
  mapScoreSimulationOsu?: MapScoreSimulationOsu;
  mapScoreSimulationTaiko?: MapScoreSimulationTaiko;
  mapScoreSimulationCtb?: MapScoreSimulationCtb;
  mapScoreSimulationMania?: MapScoreSimulationMania;
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

type MapScoreSimulationTaiko = {
  mods?: ModAcronym[];
  combo?: number;
  misses?: number;
  accuracy?: number;
  goods?: number;
  speed?: number;
  od?: number;
  hp?: number;
};

type MapScoreSimulationCtb = {
  mods?: ModAcronym[];
  combo?: number;
  misses?: number;
  accuracy?: number;
  smallMisses?: number;
  speed?: number;
  ar?: number;
  cs?: number;
  hp?: number;
};

type MapScoreSimulationMania = {
  mods?: ModAcronym[];
  combo?: number;
  misses?: number;
  accuracy?: number;
  speed?: number;
  od?: number;
  hp?: number;
};

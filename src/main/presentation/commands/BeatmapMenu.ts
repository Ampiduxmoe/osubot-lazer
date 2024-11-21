import {MapInfo} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {GetBeatmapInfoUseCase} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {OsuServer} from '../../primitives/OsuServer';
import {BEATMAP_LINK} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {TextCommand} from './base/TextCommand';
import {GetInitiatorAppUserId} from './common/Signatures';

export abstract class BeatmapMenu<TContext, TOutput> extends TextCommand<
  BeatmapMenuExecutionArgs,
  BeatmapMenuViewParams,
  TContext,
  TOutput
> {
  internalName = BeatmapMenu.name;
  shortDescription = 'показать меню для карты';
  longDescription = 'Отображает контекстное меню для карты';
  notices = [];

  static prefixes = new CommandPrefixes('[beatmap]');
  prefixes = BeatmapMenu.prefixes;

  private static commandStructure = [
    {argument: BEATMAP_LINK, isOptional: false},
  ];

  constructor(
    public textProcessor: TextProcessor,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getBeatmapInfo: GetBeatmapInfoUseCase
  ) {
    super(BeatmapMenu.commandStructure);
  }

  matchText(text: string): CommandMatchResult<BeatmapMenuExecutionArgs> {
    const fail = CommandMatchResult.fail<BeatmapMenuExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const beatmapLink = argsProcessor.use(BEATMAP_LINK).at(0).extract();
    if (beatmapLink === undefined) {
      return fail;
    }
    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      server: beatmapLink.server,
      beatmapId: beatmapLink.id,
    });
  }

  process(
    args: BeatmapMenuExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<BeatmapMenuViewParams> {
    const value: BeatmapMenuViewParams = (() => {
      return {
        server: args.server,
        beatmapId: args.beatmapId,
        getMapInfo: () =>
          this.getBeatmapInfo
            .execute({
              initiatorAppUserId: this.getInitiatorAppUserId(ctx),
              server: args.server,
              beatmapId: args.beatmapId,
            })
            .then(res => res.beatmapInfo),
      };
    })();
    return MaybeDeferred.fromValue(value);
  }

  createOutputMessage(params: BeatmapMenuViewParams): MaybeDeferred<TOutput> {
    const {server, beatmapId, getMapInfo} = params;
    return this.createMapMenuMessage(server, beatmapId, getMapInfo);
  }

  abstract createMapMenuMessage(
    server: OsuServer,
    beatmapId: number,
    getMapInfo: () => Promise<MapInfo | undefined>
  ): MaybeDeferred<TOutput>;

  unparse(args: BeatmapMenuExecutionArgs): string {
    const tokens = [
      BEATMAP_LINK.unparse({server: args.server, id: args.beatmapId}),
    ];
    return this.textProcessor.detokenize(tokens);
  }
}

export type BeatmapMenuExecutionArgs = {
  server: OsuServer;
  beatmapId: number;
};

export type BeatmapMenuViewParams = {
  server: OsuServer;
  beatmapId: number;
  getMapInfo: () => Promise<MapInfo | undefined>;
};

import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {OsuServer} from '../../primitives/OsuServer';
import {BEATMAP_LINK} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {TextCommand} from './base/TextCommand';

export abstract class BeatmapMenu<TContext, TOutput> extends TextCommand<
  BeatmapMenuExecutionArgs,
  BeatmapMenuViewParams,
  TContext,
  TOutput
> {
  internalName = BeatmapMenu.name;
  shortDescription = 'показать меню для карты';
  longDescription = 'Отображает контекстное меню для карты';
  notice = undefined;

  static prefixes = new CommandPrefixes('[beatmap]');
  prefixes = BeatmapMenu.prefixes;

  private static commandStructure = [
    {argument: BEATMAP_LINK, isOptional: false},
  ];

  textProcessor: TextProcessor;
  constructor(textProcessor: TextProcessor) {
    super(BeatmapMenu.commandStructure);
    this.textProcessor = textProcessor;
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
    args: BeatmapMenuExecutionArgs
  ): MaybeDeferred<BeatmapMenuViewParams> {
    const value: BeatmapMenuViewParams = (() => {
      return {
        server: args.server,
        beatmapId: args.beatmapId,
      };
    })();
    return MaybeDeferred.fromValue(value);
  }

  createOutputMessage(params: BeatmapMenuViewParams): MaybeDeferred<TOutput> {
    const {server, beatmapId} = params;
    return this.createMapMenuMessage(server, beatmapId);
  }

  abstract createMapMenuMessage(
    server: OsuServer,
    beatmapId: number
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
};

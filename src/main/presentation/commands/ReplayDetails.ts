import {MapInfo} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {GetBeatmapInfoUseCase} from '../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {ReplayInfo} from '../../application/usecases/parse_replay/ParseReplayResponse';
import {ParseReplayUseCase} from '../../application/usecases/parse_replay/ParseReplayUseCase';
import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {OsuServer} from '../../primitives/OsuServer';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {TextCommand} from './base/TextCommand';
import {GetInitiatorAppUserId, GetReplayFile} from './common/Signatures';

export abstract class ReplayDetails<TContext, TOutput> extends TextCommand<
  ReplayDetailsExecutionArgs,
  ReplayDetailsViewParams,
  TContext,
  TOutput
> {
  internalName = ReplayDetails.name;
  shortDescription = 'показать информацию о реплее';
  longDescription = 'Отображает информацию о реплее';
  notices = [];

  static prefixes = new CommandPrefixes('[replay]');
  prefixes = ReplayDetails.prefixes;

  private static commandStructure = [];

  public textProcessor: TextProcessor = {
    tokenize: function (): string[] {
      return [];
    },
    detokenize: function (): string {
      return '';
    },
  };

  constructor(
    protected getReplayFile: GetReplayFile<TContext>,
    protected parseReplayFile: ParseReplayUseCase,
    protected getInitiatorAppUserId: GetInitiatorAppUserId<TContext>,
    protected getBeatmapInfo: GetBeatmapInfoUseCase
  ) {
    super(ReplayDetails.commandStructure);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  matchText(text: string): CommandMatchResult<ReplayDetailsExecutionArgs> {
    return CommandMatchResult.ok({});
  }

  process(
    _: ReplayDetailsExecutionArgs,
    ctx: TContext
  ): MaybeDeferred<ReplayDetailsViewParams> {
    const valuePromise: Promise<ReplayDetailsViewParams> = (async () => {
      const replay = await this.getReplayFile(ctx);
      const replayInfoResult = await this.parseReplayFile.execute({
        data: replay,
      });
      const replayInfo = replayInfoResult.replay;
      if (replayInfo === undefined) {
        throw Error('Could not extract data from replay');
      }
      const initiatorAppUserId = this.getInitiatorAppUserId(ctx);
      const mapInfoResult = await this.getBeatmapInfo.execute({
        initiatorAppUserId: initiatorAppUserId,
        beatmapHash: replayInfo.beatmapHash,
        server: OsuServer.Bancho,
      });
      return {
        replayInfo: replayInfo,
        mapInfo: mapInfoResult.beatmapInfo,
      };
    })();
    return MaybeDeferred.fromInstantPromise(valuePromise);
  }

  createOutputMessage(params: ReplayDetailsViewParams): MaybeDeferred<TOutput> {
    const {replayInfo, mapInfo} = params;
    if (mapInfo === undefined) {
      return this.createReplayInfoWithoutMapMessage(replayInfo);
    }
    return this.createReplayInfoMessage(replayInfo, mapInfo);
  }

  abstract createReplayInfoWithoutMapMessage(
    replayInfo: ReplayInfo
  ): MaybeDeferred<TOutput>;
  abstract createReplayInfoMessage(
    replayInfo: ReplayInfo,
    mapInfo: MapInfo
  ): MaybeDeferred<TOutput>;

  unparse(): string {
    return '';
  }
}

export type ReplayDetailsExecutionArgs = {};

export type ReplayDetailsViewParams = {
  replayInfo: ReplayInfo;
  mapInfo: MapInfo | undefined;
};

import {TimeIntervalUsageSummary} from '../../application/usecases/get_api_usage_summary/GetApiUsageSummaryResponse';
import {GetApiUsageSummaryUseCase} from '../../application/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {
  APP_USER_ID,
  DATE,
  WORD,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {TextCommand} from './base/TextCommand';

export abstract class ApiUsageSummary<TContext, TOutput> extends TextCommand<
  ApiUsageSummaryExecutionArgs,
  ApiUsageSummaryViewParams,
  TContext,
  TOutput
> {
  internalName = ApiUsageSummary.name;
  shortDescription = 'статистика обращений к osu API';
  longDescription = 'Отображает сводку по количеству обращений к API';
  notice = undefined;

  static prefixes = new CommandPrefixes();
  prefixes = ApiUsageSummary.prefixes;

  private static WORD_API = WORD('api');
  private WORD_API = ApiUsageSummary.WORD_API;
  private static WORD_USAGE = WORD('usage');
  private WORD_USAGE = ApiUsageSummary.WORD_USAGE;
  private static commandStructure = [
    {argument: this.WORD_API, isOptional: false},
    {argument: this.WORD_USAGE, isOptional: false},
    {argument: DATE, isOptional: false},
    {argument: APP_USER_ID, isOptional: true},
  ];

  textProcessor: TextProcessor;
  getApiUsageSummary: GetApiUsageSummaryUseCase;
  constructor(
    textProcessor: TextProcessor,
    getApiUsageSummary: GetApiUsageSummaryUseCase
  ) {
    super(ApiUsageSummary.commandStructure);
    this.textProcessor = textProcessor;
    this.getApiUsageSummary = getApiUsageSummary;
  }

  matchText(text: string): CommandMatchResult<ApiUsageSummaryExecutionArgs> {
    const fail = CommandMatchResult.fail<ApiUsageSummaryExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    if (argsProcessor.use(this.WORD_API).at(0).extract() === undefined) {
      return fail;
    }
    if (argsProcessor.use(this.WORD_USAGE).at(0).extract() === undefined) {
      return fail;
    }
    const date = argsProcessor.use(DATE).extract();
    if (date === undefined) {
      return fail;
    }
    const appUserId = argsProcessor.use(APP_USER_ID).extract();
    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    return CommandMatchResult.ok({
      appUserId: appUserId,
      date: date,
    });
  }

  async process(
    args: ApiUsageSummaryExecutionArgs
  ): Promise<ApiUsageSummaryViewParams> {
    const timeStart = args.date.setUTCHours(0, 0, 0, 0);
    const timeEnd = args.date.setUTCHours(23, 59, 59, 999);

    const apiUsageSummaryResponse = await this.getApiUsageSummary.execute({
      timeStart: timeStart,
      timeEnd: timeEnd,
      appUserId: args.appUserId,
    });

    return {
      appUserIdInput: args.appUserId,
      apiUsageSummary: apiUsageSummaryResponse.usageSummary,
    };
  }

  createOutputMessage(params: ApiUsageSummaryViewParams): Promise<TOutput> {
    const {appUserIdInput, apiUsageSummary} = params;
    if (apiUsageSummary.length === 0) {
      if (appUserIdInput !== undefined) {
        return this.createEmptyUserSummaryMessage(appUserIdInput);
      }
      return this.createEmptySummaryMessage();
    }
    return this.createUsageSummaryMessage(apiUsageSummary);
  }

  abstract createUsageSummaryMessage(
    usageSummary: TimeIntervalUsageSummary[]
  ): Promise<TOutput>;
  abstract createEmptyUserSummaryMessage(appUserId: string): Promise<TOutput>;
  abstract createEmptySummaryMessage(): Promise<TOutput>;

  unparse(args: ApiUsageSummaryExecutionArgs): string {
    const tokens = [
      this.WORD_API.unparse(''),
      this.WORD_USAGE.unparse(''),
      DATE.unparse(args.date),
    ];
    if (args.appUserId !== undefined) {
      tokens.push(APP_USER_ID.unparse(args.appUserId));
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type ApiUsageSummaryExecutionArgs = {
  date: Date;
  appUserId: string | undefined;
};

export type ApiUsageSummaryViewParams = {
  appUserIdInput: string | undefined;
  apiUsageSummary: TimeIntervalUsageSummary[];
};

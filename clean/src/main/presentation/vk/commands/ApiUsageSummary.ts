import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {APP_CODE_NAME} from '../../../App';
import {
  APP_USER_ID,
  DATE,
  WORD,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {GetApiUsageSummaryUseCase} from '../../../application/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {TimeIntervalUsageSummary} from '../../../application/usecases/get_api_usage_summary/GetApiUsageSummaryResponse';
import {Timespan} from '../../../../primitives/Timespan';
import {sumBy} from '../../../../primitives/Arrays';
import {CommandPrefixes} from '../../common/CommandPrefixes';

export class ApiUsageSummary extends VkCommand<
  ApiUsageSummaryExecutionArgs,
  ApiUsageSummaryViewParams
> {
  internalName = ApiUsageSummary.name;
  shortDescription = 'статистика обращений к osu API';
  longDescription = 'Отображает сводку по количеству обращений к API';

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

  adminVkIds: number[];
  getApiUsageSummary: GetApiUsageSummaryUseCase;
  constructor(
    adminVkIds: number[],
    getApiUsageSummary: GetApiUsageSummaryUseCase
  ) {
    super(ApiUsageSummary.commandStructure);
    this.adminVkIds = adminVkIds;
    this.getApiUsageSummary = getApiUsageSummary;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ApiUsageSummaryExecutionArgs> {
    const fail = CommandMatchResult.fail<ApiUsageSummaryExecutionArgs>();
    if (!this.adminVkIds.includes(ctx.senderId)) {
      return fail;
    }
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
    if (argsProcessor.use(this.WORD_API).at(0).extract() === undefined) {
      return fail;
    }
    if (argsProcessor.use(this.WORD_USAGE).at(0).extract() === undefined) {
      return fail;
    }
    const date = argsProcessor.use(DATE).extract();
    const appUserId = argsProcessor.use(APP_USER_ID).extract();
    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (date === undefined) {
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
    const {date, appUserId} = args;

    const timeStart = date.setUTCHours(0, 0, 0, 0);
    const timeEnd = date.setUTCHours(23, 59, 59, 999);

    const apiUsageSummaryResponse = await this.getApiUsageSummary.execute({
      timeStart: timeStart,
      timeEnd: timeEnd,
      appUserId: appUserId,
    });

    return {
      appUserIdInput: appUserId,
      apiUsageSummary: apiUsageSummaryResponse.usageSummary,
    };
  }

  createOutputMessage(params: ApiUsageSummaryViewParams): VkOutputMessage {
    const {appUserIdInput, apiUsageSummary} = params;
    if (apiUsageSummary.length === 0) {
      if (appUserIdInput !== undefined) {
        return this.createEmptyUserSummaryMessage(appUserIdInput);
      }
      return this.createEmptySummaryMessage();
    }
    const firstIntervalSummary = apiUsageSummary[0];
    const lastIntervalSummary = apiUsageSummary[apiUsageSummary.length - 1];
    const startDate = new Date(firstIntervalSummary.timeWindowStart);
    const endDate = new Date(lastIntervalSummary.timeWindowEnd);
    const byUser: {
      [userId: string]: number;
    } = {};
    const rows = apiUsageSummary.map(interval => {
      const intervalStart = new Date(interval.timeWindowStart);
      const intervalDuration = new Timespan().addMilliseconds(
        interval.timeWindowEnd - interval.timeWindowStart + 1
      );
      const startTimeHhMm = intervalStart.toISOString().substring(11, 16);
      const durationMinutes = intervalDuration.minutes;
      const totalRequests = sumBy(
        u => sumBy(x => x.count, u.counts),
        interval.appUsers
      );
      const byTarget: {
        [target: string]: {
          count: number;
          subtargets: {subtarget: string; count: number}[];
        };
      } = {};
      for (const user of interval.appUsers) {
        for (const requestCount of user.counts) {
          const target = requestCount.target;
          if (byTarget[target] === undefined) {
            byTarget[target] = {count: 0, subtargets: []};
          }
          byTarget[target].count += requestCount.count;
          byTarget[target].subtargets.push({
            subtarget: requestCount.subtarget ?? '~',
            count: requestCount.count,
          });

          const userId = user.appUserId;
          if (byUser[userId] === undefined) {
            byUser[userId] = 0;
          }
          byUser[userId] += requestCount.count;
        }
      }
      const allTargets = Object.keys(byTarget).sort();
      const totalString = `${startTimeHhMm}+${durationMinutes}m: ${totalRequests}`;
      const detailsText = allTargets
        .map(t => {
          const bySubtarget: {[subtarget: string]: number} = {};
          for (const subtargetData of byTarget[t].subtargets) {
            const subtarget = subtargetData.subtarget;
            if (bySubtarget[subtarget] === undefined) {
              bySubtarget[subtarget] = subtargetData.count;
            }
          }
          const allSubtargets = Object.keys(bySubtarget).sort();
          const subtargetsText = allSubtargets
            .map(
              // eslint-disable-next-line no-irregular-whitespace
              s => `　　${s}: ${bySubtarget[s]}`
            )
            .join('\n');
          // eslint-disable-next-line no-irregular-whitespace
          return `　${t}: ${byTarget[t].count}\n${subtargetsText}`;
        })
        .join('\n');
      return `${totalString}\n${detailsText}`;
    });
    const userContributionRows = Object.keys(byUser)
      .map(userId => ({userId: userId, count: byUser[userId]}))
      .sort((a, b) => b.count - a.count)
      .map(x => `${x.userId}: ${x.count}`);
    const text = `
${startDate.toISOString()} - ${endDate.toISOString()}

${rows.join('\n')}

${userContributionRows.join('\n')}
    `.trim();

    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createEmptyUserSummaryMessage(appUserId: string): VkOutputMessage {
    return {
      text: `Статистика пользователя ${appUserId} не найдена`,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createEmptySummaryMessage(): VkOutputMessage {
    return {
      text: 'Статистика не найдена',
      attachment: undefined,
      buttons: undefined,
    };
  }
}

type ApiUsageSummaryExecutionArgs = {
  date: Date;
  appUserId: string | undefined;
};

type ApiUsageSummaryViewParams = {
  appUserIdInput: string | undefined;
  apiUsageSummary: TimeIntervalUsageSummary[];
};

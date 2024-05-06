import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand, CommandPrefixes} from './base/VkCommand';
import {APP_CODE_NAME} from '../../../App';
import {
  APP_USER_ID,
  DAY_OFFSET,
  WORD,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {GetApiUsageSummaryUseCase} from '../../../domain/usecases/get_api_usage_summary/GetApiUsageSummaryUseCase';
import {TimeIntervalUsageSummary} from '../../../domain/usecases/get_api_usage_summary/GetApiUsageSummaryResponse';
import {Timespan} from '../../../../primitives/Timespan';
import {sumBy} from '../../../../primitives/Arrays';

export class ApiUsageSummary extends VkCommand<
  ApiUsageSummaryExecutionArgs,
  ApiUsageSummaryViewParams
> {
  internalName = ApiUsageSummary.name;
  shortDescription = 'статистика обращений к osu API';
  longDescription = 'Отображает сводку по количеству обращений к API';

  static prefixes = new CommandPrefixes();
  prefixes = ApiUsageSummary.prefixes;

  private WORD_API = WORD('api');
  private WORD_USAGE = WORD('usage');
  commandStructure = [
    {argument: this.WORD_API, isOptional: false},
    {argument: this.WORD_USAGE, isOptional: false},
    {argument: DAY_OFFSET, isOptional: false},
    {argument: APP_USER_ID, isOptional: true},
  ];

  adminVkIds: number[];
  getApiUsageSummary: GetApiUsageSummaryUseCase;
  constructor(
    adminVkIds: number[],
    getApiUsageSummary: GetApiUsageSummaryUseCase
  ) {
    super();
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
    argsProcessor.use(this.WORD_API).at(0).extract();
    argsProcessor.use(this.WORD_USAGE).at(0).extract();
    const dayOffset = argsProcessor.use(DAY_OFFSET).extract();
    const appUserId = argsProcessor.use(APP_USER_ID).extract();
    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (dayOffset === undefined) {
      return fail;
    }
    return CommandMatchResult.ok({
      appUserId: appUserId,
      dayOffset: dayOffset,
    });
  }

  async process(
    args: ApiUsageSummaryExecutionArgs
  ): Promise<ApiUsageSummaryViewParams> {
    const {dayOffset, appUserId: appUserId} = args;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime());
    tomorrowStart.setUTCDate(todayStart.getUTCDate() + 1);
    const todayEnd = new Date(tomorrowStart.getTime() - 1);

    const targetDayStart = new Date(todayStart.getTime());
    targetDayStart.setUTCDate(todayStart.getUTCDate() + dayOffset);
    const targetDayEnd = new Date(todayEnd.getTime());
    targetDayStart.setUTCDate(todayEnd.getUTCDate() + dayOffset);

    const apiUsageSummaryResponse = await this.getApiUsageSummary.execute({
      timeStart: targetDayStart.getTime(),
      timeEnd: targetDayEnd.getTime(),
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
    const endDate = new Date(lastIntervalSummary.timeWindowStart);
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
    const text = `
${startDate.toISOString()} - ${endDate.toISOString()}

${rows.join('\n')}
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

interface ApiUsageSummaryExecutionArgs {
  dayOffset: number;
  appUserId: string | undefined;
}

interface ApiUsageSummaryViewParams {
  appUserIdInput: string | undefined;
  apiUsageSummary: TimeIntervalUsageSummary[];
}

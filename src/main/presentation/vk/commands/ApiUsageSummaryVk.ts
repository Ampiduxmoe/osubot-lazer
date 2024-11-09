import {APP_CODE_NAME} from '../../../App';
import {TimeIntervalUsageSummary} from '../../../application/usecases/get_api_usage_summary/GetApiUsageSummaryResponse';
import {sumBy} from '../../../primitives/Arrays';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {Timespan} from '../../../primitives/Timespan';
import {
  ApiUsageSummary,
  ApiUsageSummaryExecutionArgs,
} from '../../commands/ApiUsageSummary';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ApiUsageSummaryVk extends ApiUsageSummary<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ApiUsageSummaryExecutionArgs> {
    const fail = CommandMatchResult.fail<ApiUsageSummaryExecutionArgs>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    if (command === undefined) {
      return fail;
    }
    return this.matchText(command);
  }

  createUsageSummaryMessage(
    apiUsageSummary: TimeIntervalUsageSummary[]
  ): MaybeDeferred<VkOutputMessage> {
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

    return MaybeDeferred.fromValue({
      text: text,
    });
  }

  createEmptyUserSummaryMessage(
    appUserId: string
  ): MaybeDeferred<VkOutputMessage> {
    return MaybeDeferred.fromValue({
      text: `Статистика пользователя ${appUserId} не найдена`,
    });
  }

  createEmptySummaryMessage(): MaybeDeferred<VkOutputMessage> {
    return MaybeDeferred.fromValue({
      text: 'Статистика не найдена',
    });
  }
}

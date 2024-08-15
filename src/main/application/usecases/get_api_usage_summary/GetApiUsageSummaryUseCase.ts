import {UseCase} from '../UseCase';
import {GetApiUsageSummaryRequest} from './GetApiUsageSummaryRequest';
import {GetApiUsageSummaryResponse} from './GetApiUsageSummaryResponse';
import {AppUserApiRequestsSummariesDao} from '../../requirements/dao/AppUserApiRequestsSummariesDao';

export class GetApiUsageSummaryUseCase
  implements UseCase<GetApiUsageSummaryRequest, GetApiUsageSummaryResponse>
{
  constructor(protected apiRequestsSummaries: AppUserApiRequestsSummariesDao) {}

  async execute(
    params: GetApiUsageSummaryRequest
  ): Promise<GetApiUsageSummaryResponse> {
    const usageSummary = await this.apiRequestsSummaries.get(
      params.timeStart,
      params.timeEnd,
      params.appUserId
    );
    return {
      usageSummary: [...usageSummary].sort(
        (a, b) => a.timeWindowStart - b.timeWindowStart
      ),
    };
  }
}

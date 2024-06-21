import {BeatmapsetStatus} from '../../../domain/entities/Beatmapset';
import {RecentScore} from '../../requirements/dao/OsuRecentScoresDao';

export function getBeatmapsetStatus(score: RecentScore): BeatmapsetStatus {
  switch (score.beatmapset.status) {
    case 'graveyard':
      return 'Graveyard';
    case 'wip':
      return 'Wip';
    case 'pending':
      return 'Pending';
    case 'ranked':
      return 'Ranked';
    case 'approved':
      return 'Approved';
    case 'qualified':
      return 'Qualified';
    case 'loved':
      return 'Loved';
  }
}

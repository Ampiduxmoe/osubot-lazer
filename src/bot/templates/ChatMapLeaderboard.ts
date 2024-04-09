import {PerformanceCalculator} from '../performance/PerformanceCalculator';
import {IScore} from '../../dtos/osu/scores/IScore';
import {round} from '../../primitives/Numbers';
import {Result} from '../../primitives/Result';

export async function chatMapLeaderboardTemplate(
  scores: IScore[],
  mapsetMetadata: ChatMapLeaderboardMapsetMetadata
): Promise<Result<string>> {
  const firstScore = scores[0];
  const firstScoreSimResult = await PerformanceCalculator.simulate({
    mods: firstScore.mods,
    combo: firstScore.max_combo,
    misses: firstScore.statistics.count_miss,
    mehs: firstScore.statistics.count_50,
    goods: firstScore.statistics.count_100,
    beatmap_id: firstScore.beatmap!.id,
  });
  if (firstScoreSimResult.isFailure) {
    const failure = firstScoreSimResult.asFailure();
    const errorText = 'Could not simulate map score';
    console.log(errorText);
    return Result.fail([Error(errorText), ...failure.errors]);
  }
  const firstScoreSim = firstScoreSimResult.asSuccess().value;
  const scoreTexts = scores
    .map(s => s) // where is .toSorted()?
    .sort((a, b) => b.score - a.score)
    .map((score, index) => {
      const scorePosition = index + 1;
      const username = score.user!.username;
      const scoreAmount = score.score;

      const combo = score.max_combo;
      const max_combo = firstScoreSim.difficulty_attributes.max_combo;
      const comboString = `${combo}x/${max_combo}x`;

      const acc = round(score.accuracy * 100, 2);

      const counts = score.statistics;
      const misses = counts.count_miss;

      const pp = round(score.pp!, 2);

      const mods = score.mods;
      const modsString = mods.join('');
      let modsPlusSign = '';
      if (mods.length) {
        modsPlusSign = '+';
      }

      const date = new Date(Date.parse(score.created_at));
      const day = date.getUTCDate();
      const dayFormatted = (day > 9 ? '' : '0') + day;
      const month = date.getUTCMonth() + 1; // why?
      const monthFormatted = (month > 9 ? '' : '0') + month;
      const year = date.getUTCFullYear();

      /* eslint-disable no-irregular-whitespace */
      return `
${scorePosition}.　${username}　${scoreAmount}　${comboString}　${acc}%　${misses}X　${pp}pp　${modsPlusSign}${modsString}　${dayFormatted}.${monthFormatted}.${year}
    `.trim();
    });

  const artist = mapsetMetadata.artist;
  const title = mapsetMetadata.title;
  const diffname = firstScore.beatmap!.version;
  const creator = mapsetMetadata.creator;
  const mapUrlShort = firstScore.beatmap!.url.replace('beatmaps', 'b');
  const scoresSeparator = '\n';
  return Result.ok(
    `
[Server: Bancho]
Топ чата на карте [STD]

${artist} - ${title} [${diffname}] by ${creator}
${mapUrlShort}

${scoreTexts.join(scoresSeparator)}
  `.trim()
  );
}

export interface ChatMapLeaderboardMapsetMetadata {
  artist: string;
  title: string;
  creator: string;
}

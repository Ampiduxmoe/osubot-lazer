import {IUserExtended} from '../../dtos/osu/users/IUserExtended';
import {Timespan} from '../../primitives/Timespan';
import {round} from '../../primitives/Numbers';

export function showUserStatsTemplate(user: IUserExtended) {
  const username = user.username;
  const rankGlobal = user.statistics.global_rank;
  const rankCountry = user.statistics.country_rank;
  const countryCode = user.country_code;
  const playcount = user.statistics.play_count;
  const lvl = user.statistics.level.current;
  const playtimeSeconds = user.statistics.play_time;
  const playtime = new Timespan().addSeconds(playtimeSeconds);
  const pp = user.statistics.pp;
  const accuracy = round(user.statistics.hit_accuracy, 2);
  const userId = user.id;
  return `
[Server: Bancho]
Player: ${username} (STD)
Rank: #${rankGlobal} (${countryCode} #${rankCountry})
Playcount: ${playcount} (Lv${lvl})
Playtime: ${playtime.days}d ${playtime.hours}h ${playtime.minutes}m
PP: ${pp}
Accuracy: ${accuracy}%

https://osu.ppy.sh/u/${userId}
`.trim();
}

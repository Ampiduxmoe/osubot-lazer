import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {CommandMatchResult} from './CommandMatchResult';
import {UserDbObject, UserStatsDbObject} from '../database/Entities';
import {BanchoUserStats} from '../database/modules/BanchoUserStats';
import {UsernameDecorations} from '../database/modules/UsernameDecorations';

export class ChatLeaderboard extends BotCommand<ChatLeaderboardParams> {
  name = ChatLeaderboard.name;
  title = 'Топ чата';
  description = 'Показывает список игроков беседы по убыванию пп';
  usage = 'chat <id беседы>';

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
      db.getModuleOrDefault(BanchoUsers, undefined),
      db.getModuleOrDefault(BanchoUserStats, undefined),
      db.getModuleOrDefault(UsernameDecorations, undefined),
    ];
    for (const module of requiredModules) {
      if (module === undefined) {
        return false;
      }
    }
    return true;
  }
  matchMessage(
    ctx: MessageContext<ContextDefaultState> & object
  ): CommandMatchResult<ChatLeaderboardParams> {
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    if (tokens[1] === 'chat') {
      if (!ctx.isChat) {
        return CommandMatchResult.fail();
      }
      const peerId = ctx.peerId;
      return CommandMatchResult.ok({peerId});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: ChatLeaderboardParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    const peerId = params.peerId;
    if (!peerId) {
      ctx.reply('Не указан ID беседы!');
      return;
    }
    const chatMembers = await this.vk.api.messages.getConversationMembers({
      peer_id: peerId,
    });
    const profileIds = chatMembers.profiles.map(p => p.id);
    console.log(
      `Got profile IDs for chat ${peerId}: ${JSON.stringify(profileIds)}`
    );
    const userPromises: Promise<UserDbObject | undefined>[] = [];
    const users = this.db.getModule(BanchoUsers);
    for (const profileId of profileIds) {
      ctx.chatId;
      userPromises.push(users.getById(profileId));
    }
    const chatUsers: (UserDbObject | undefined)[] = [];
    for (const userPromise of userPromises) {
      chatUsers.push(await userPromise);
    }
    const uniqueOsuIds = chatUsers
      .filter(u => u !== undefined)
      .map(u => u!.osu_id);
    console.log(
      `Got osu IDs for chat ${peerId}: ${JSON.stringify(uniqueOsuIds)}`
    );
    const userStatsPromises: Promise<UserStatsDbObject | undefined>[] = [];
    const userStats = this.db.getModule(BanchoUserStats);
    for (const osuId of uniqueOsuIds) {
      userStatsPromises.push(userStats.getById(osuId));
    }
    const chatUserStats: (UserStatsDbObject | undefined)[] = [];
    for (const userStatsPromise of userStatsPromises) {
      chatUserStats.push(await userStatsPromise);
    }
    const sortedStats = chatUserStats
      .filter(s => s !== undefined)
      .sort((a, b) => b!.pp - a!.pp);
    const decors = this.db.getModule(UsernameDecorations);
    const statStringsPromises = sortedStats.map(async (stats, index) => {
      const s = stats!;
      const n = index + 1;
      let username = s.username;
      const decor = await decors.getByUsername(username);
      if (decor !== undefined) {
        username = decor.pattern.replace('${username}', username);
      }
      const pp = Math.floor(s.pp);
      const rank = s.rank;
      const acc = s.accuracy.toFixed(2);
      // eslint-disable-next-line no-irregular-whitespace
      return `${n}.　${username}　${pp}pp　#${rank}　${acc}%`;
    });
    const statStrings = await Promise.all(statStringsPromises);
    const joinedStats = statStrings.join('\n');
    ctx.reply(`Топ чата (ID ${peerId - 2000000000}):\n${joinedStats}`);
    return;
  }
}

export interface ChatLeaderboardParams {
  peerId: number | undefined;
}

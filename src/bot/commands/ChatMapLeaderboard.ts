import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {
  chatMapLeaderboardTemplate,
  ChatMapLeaderboardMapsetMetadata,
} from '../templates/ChatMapLeaderboard';
import {BanchoChatBeatmapCache} from '../database/modules/BanchoChatBeatmapCache';
import {UserDbObject} from '../database/Entities';
import {stringifyErrors} from '../../primitives/Errors';
import {BanchoBeatmapsetsCache} from '../database/modules/BanchoBeatmapsetsCache';

export class ChatMapLeadearboard extends BotCommand<ChatMapLeaderboardParams> {
  name = ChatMapLeadearboard.name;
  title = 'Топ чата на карте';
  description = 'Показывает лучшие скоры игроков этого чата на указанной карте';
  usage = 'lb [id карты]';

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
      db.getModuleOrDefault(BanchoUsers, undefined),
      db.getModuleOrDefault(BanchoUsersCache, undefined),
      db.getModuleOrDefault(BanchoChatBeatmapCache, undefined),
      db.getModuleOrDefault(BanchoBeatmapsetsCache, undefined),
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
  ): CommandMatchResult<ChatMapLeaderboardParams> {
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    if (tokens[1] === 'lb') {
      if (!ctx.isChat) {
        return CommandMatchResult.fail();
      }
      const peerId = ctx.peerId;
      let beatmapId: number | undefined = undefined;
      for (const token of tokens) {
        const parseResult = parseInt(token);
        if (!isNaN(parseResult)) {
          beatmapId = parseResult;
        }
      }
      if (beatmapId === undefined) {
        beatmapId = this.getSingleBeatmapIdFromPayloadOrText(ctx);
      }
      let mods: string[] = [];
      const modsString = tokens.find(t => t.startsWith('+'));
      if (modsString !== undefined) {
        const matchedMods = modsString
          .substring(1)
          .toUpperCase()
          .match(/.{2}/g);
        if (matchedMods) {
          mods = matchedMods
            .flat()
            .filter((value, index, array) => array.indexOf(value) === index); // unique
        }
      }
      return CommandMatchResult.ok({peerId, beatmapId, mods});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: ChatMapLeaderboardParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    const peerId = params.peerId;
    let beatmapId = params.beatmapId;
    const mods = params.mods;
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
    if (beatmapId === undefined) {
      const chatBeatmapCache = this.db.getModule(BanchoChatBeatmapCache);
      const lastSeenBeatmap = await chatBeatmapCache.getById(ctx.peerId);
      if (lastSeenBeatmap === undefined) {
        ctx.reply('Сначала отправьте карту!');
        return;
      }
      beatmapId = lastSeenBeatmap.beatmap_id;
    }
    const scorePromises = uniqueOsuIds.map(async osuUserId => {
      const mapScoreResult = await this.api.getMapUserScore(
        osuUserId,
        beatmapId!, // compiler is crazy, beatmap is never undefined here
        mods
      );
      if (mapScoreResult.isFailure) {
        const failure = mapScoreResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply(
          `Не удалось получить скор для ${osuUserId}` + `\n${errorsText}`
        );
        return undefined;
      }
      const mapScore = mapScoreResult.asSuccess().value;
      return mapScore;
    });
    const scores = (await Promise.all(scorePromises))
      .filter(s => s !== undefined)
      .map(s => s!.score);
    if (!scores.length) {
      ctx.reply('Скоры не найдены');
      return;
    }
    const mapScore = scores[0]!;
    const beatmapsetId = mapScore.beatmap!.beatmapset_id;
    const mapsetsCache = this.db.getModule(BanchoBeatmapsetsCache);
    const cachedMapset = await mapsetsCache.getById(beatmapsetId);
    let mapsetMetadata: ChatMapLeaderboardMapsetMetadata;
    if (cachedMapset !== undefined) {
      mapsetMetadata = {
        artist: cachedMapset.artist,
        title: cachedMapset.title,
        creator: cachedMapset.creator,
      };
    } else {
      const beatmapResult = await this.api.getBeatmap(beatmapId);
      if (beatmapResult.isFailure) {
        const failure = beatmapResult.asFailure();
        const errorsText = stringifyErrors(failure.errors);
        ctx.reply('Не удалось получить данные о карте' + `\n${errorsText}`);
        return;
      }
      const beatmap = beatmapResult.asSuccess().value;
      if (beatmap === undefined) {
        ctx.reply(`Карта ${beatmapId} не найдена`);
        return;
      }
      const mapset = beatmap.beatmapset;
      mapsetMetadata = {
        artist: mapset.artist,
        title: mapset.title,
        creator: mapset.creator,
      };
      mapsetsCache.add({
        beatmapset_id: beatmapsetId,
        artist: mapset.artist,
        title: mapset.title,
        creator: mapset.creator,
      });
    }
    const mapLbTemplateResult = await chatMapLeaderboardTemplate(
      scores,
      mapsetMetadata
    );
    if (mapLbTemplateResult.isFailure) {
      const failure = mapLbTemplateResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось сгенерировать текст ответа' + `\n${errorsText}`);
      return;
    }
    const replyText = mapLbTemplateResult.asSuccess().value;
    ctx.reply(replyText);
    return;
  }
}

export interface ChatMapLeaderboardParams {
  peerId: number | undefined;
  beatmapId: number | undefined;
  mods: string[];
}

import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {BanchoUsersCache} from '../database/modules/BanchoUsersCache';
import {BanchoUsers} from '../database/modules/BanchoUsers';
import {stringifyErrors} from '../../primitives/Errors';
import {BanchoBeatmapsetsCache} from '../database/modules/BanchoBeatmapsetsCache';
import {BanchoChatBeatmapCache} from '../database/modules/BanchoChatBeatmapCache';
import {BanchoCovers} from '../database/modules/BanchoCovers';
import {
  mapUserScoreTemplate,
  MapUserScoreMapsetMetadata,
} from '../templates/MapUserScore';

export class MapUserScore extends BotCommand<MapUserScoreParams> {
  name = MapUserScore.name;
  title = 'Топ скор на карте';
  description = 'Показывает лучшие скоры игрока на указанной карте';
  usage = 'c [id карты]';

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
      db.getModuleOrDefault(BanchoCovers, undefined),
      db.getModuleOrDefault(BanchoUsers, undefined),
      db.getModuleOrDefault(BanchoUsersCache, undefined),
      db.getModuleOrDefault(BanchoBeatmapsetsCache, undefined),
      db.getModuleOrDefault(BanchoChatBeatmapCache, undefined),
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
  ): CommandMatchResult<MapUserScoreParams> {
    const text = ctx.text!.toLowerCase();
    const tokens = text.split(' ');
    if (tokens[1] === 'c') {
      let username: string | undefined = tokens[2];
      if (username !== undefined) {
        if (
          username.startsWith('+') ||
          !isNaN(parseInt(username)) ||
          this.hasMapLink(username)
        ) {
          username = undefined;
        }
      }
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
      return CommandMatchResult.ok({username, beatmapId, mods});
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: MapUserScoreParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    const username = params.username;
    let beatmapId = params.beatmapId;
    const mods = params.mods;
    let osuUserId: number;
    if (!username) {
      const senderId = ctx.senderId;
      const users = this.db.getModule(BanchoUsers);
      const userFromDb = await users.getById(senderId);
      if (userFromDb) {
        console.log(
          `Successfully got osu_id for sender ${senderId} from ${BanchoUsers.name}`
        );
        osuUserId = userFromDb.osu_id;
      } else {
        ctx.reply('Не установлен ник');
        return;
      }
    } else {
      const usersCache = this.db.getModule(BanchoUsersCache);
      const usernameWithId = await usersCache.getByUsername(username);
      if (usernameWithId) {
        console.log(
          `Successfully got osu_id for username ${username} from ${BanchoUsersCache.name}`
        );
        osuUserId = usernameWithId.osu_id;
      } else {
        const userResult = await this.api.getUser(username);
        if (userResult.isFailure) {
          const failure = userResult.asFailure();
          const errorsText = stringifyErrors(failure.errors);
          ctx.reply('Не удалось получить скор на карте' + `\n${errorsText}`);
          return;
        }
        const rawUser = userResult.asSuccess().value;
        if (rawUser === undefined) {
          ctx.reply(`Пользователь с ником ${username} не найден`);
          return;
        }
        usersCache.add({
          osu_id: rawUser.id,
          username: rawUser.username,
        });
        console.log(
          `Successfully got osu_id for username ${username} from API`
        );
        osuUserId = rawUser.id;
      }
    }
    if (beatmapId === undefined) {
      const chatBeatmapCache = this.db.getModule(BanchoChatBeatmapCache);
      const lastSeenBeatmap = await chatBeatmapCache.getById(ctx.peerId);
      if (lastSeenBeatmap === undefined) {
        ctx.reply('Сначала отправьте карту!');
        return;
      }
      beatmapId = lastSeenBeatmap.beatmap_id;
    }
    const mapScoreResult = await this.api.getMapUserScore(
      osuUserId,
      beatmapId,
      mods
    );
    if (mapScoreResult.isFailure) {
      const failure = mapScoreResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось получить скор на карте' + `\n${errorsText}`);
      return;
    }
    const mapScore = mapScoreResult.asSuccess().value;
    if (!mapScore) {
      ctx.reply('Скор не найден');
      return;
    }

    const chatBeatmapCache = this.db.getModule(BanchoChatBeatmapCache);
    const prevMap = await chatBeatmapCache.getById(ctx.peerId);
    if (prevMap !== undefined) {
      await chatBeatmapCache.delete(prevMap);
    }
    await chatBeatmapCache.add({
      peer_id: ctx.peerId,
      beatmap_id: mapScore.score.beatmap!.id,
    });

    const beatmapsetId = mapScore.score.beatmap!.beatmapset_id;
    const mapsetsCache = this.db.getModule(BanchoBeatmapsetsCache);
    const cachedMapset = await mapsetsCache.getById(beatmapsetId);
    let mapsetMetadata: MapUserScoreMapsetMetadata;
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
    const recentTemplateResult = await mapUserScoreTemplate(
      mapScore,
      mapsetMetadata
    );
    if (recentTemplateResult.isFailure) {
      const failure = recentTemplateResult.asFailure();
      const errorsText = stringifyErrors(failure.errors);
      ctx.reply('Не удалось сгенерировать текст ответа' + `\n${errorsText}`);
      return;
    }
    const replyText = recentTemplateResult.asSuccess().value;
    const covers = this.db.getModule(BanchoCovers);
    const coverResult = await covers.getByIdOrDownload(beatmapsetId, this.vk);
    if (coverResult.isFailure) {
      ctx.reply(replyText + '\n\nБГ карты прикрепить не удалось 😭');
      return;
    }
    const cover = coverResult.asSuccess().value;
    ctx.reply(replyText, {
      attachment: cover.attachment,
    });
    return;
  }
}

export interface MapUserScoreParams {
  username: string | undefined;
  beatmapId: number | undefined;
  mods: string[];
}

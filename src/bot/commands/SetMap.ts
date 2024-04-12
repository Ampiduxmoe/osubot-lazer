import {MessageContext, ContextDefaultState} from 'vk-io';
import {BotCommand} from './BotCommand';
import {CommandMatchResult} from './CommandMatchResult';
import {BanchoChatBeatmapCache} from '../database/modules/BanchoChatBeatmapCache';

export class SetMap extends BotCommand<SetMapParams> {
  name = SetMap.name;
  title = 'Установить карту';
  description = 'бот запоминает указанную карту как последнюю';
  usage = 'отправить сообщение со ссылкой на карту';
  ignorePrefix = true;
  ignoreMissingTextAndPayload = true;

  isAvailable(): Boolean {
    const db = this.db;
    const requiredModules = [
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
  ): CommandMatchResult<SetMapParams> {
    if (ctx.hasText) {
      const text = ctx.text!;
      if (this.hasSingleMapLink(text)) {
        const beatmapId = this.getSingleBeatmapIdFromPayloadOrText(ctx)!;
        return CommandMatchResult.ok({beatmapId});
      }
    }
    if (ctx.hasAttachments('link')) {
      const url = ctx.getAttachments('link')[0].url;
      if (this.hasSingleMapLink(url)) {
        const beatmapId = this.getSingleBeatmapIdFromPayloadOrText(ctx);
        if (beatmapId) {
          return CommandMatchResult.ok({beatmapId});
        }
      }
    }
    return CommandMatchResult.fail();
  }
  async execute(
    params: SetMapParams,
    ctx: MessageContext<ContextDefaultState> & object
  ) {
    const chatBeatmapCache = this.db.getModule(BanchoChatBeatmapCache);
    const prevMap = await chatBeatmapCache.getById(ctx.peerId);
    if (prevMap !== undefined) {
      await chatBeatmapCache.delete(prevMap);
    }
    await chatBeatmapCache.add({
      peer_id: ctx.peerId,
      beatmap_id: params.beatmapId,
    });
  }
}

export interface SetMapParams {
  beatmapId: number;
}

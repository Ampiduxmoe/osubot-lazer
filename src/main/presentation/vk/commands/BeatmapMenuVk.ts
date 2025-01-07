/* eslint-disable no-irregular-whitespace */
import {AttachmentType} from 'vk-io';
import {APP_CODE_NAME} from '../../../App';
import {BeatmapsetRankStatus} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {
  BeatmapMenu,
  BeatmapMenuExecutionArgs,
  MapInfoWithContext,
} from '../../commands/BeatmapMenu';
import {SaveLastSeenBeatmapId} from '../../commands/common/Signatures';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage, VkOutputMessageButton} from '../VkOutputMessage';
import {BeatmapInfoVk} from './BeatmapInfoVk';
import {ChatLeaderboardOnMapVk} from './ChatLeaderboardOnMapVk';
import {UserBestPlaysOnMapVk} from './UserBestPlaysOnMapVk';

export class BeatmapMenuVk extends BeatmapMenu<
  VkMessageContext,
  VkOutputMessage
> {
  constructor(
    private saveLastSeenBeatmapId: SaveLastSeenBeatmapId<VkMessageContext>,
    ...parentParams: ConstructorParameters<
      typeof BeatmapMenu<VkMessageContext, VkOutputMessage>
    >
  ) {
    super(...parentParams);
  }
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<BeatmapMenuExecutionArgs> {
    const fail = CommandMatchResult.fail<BeatmapMenuExecutionArgs>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      if (ctx.text !== undefined) {
        return ctx.text;
      }
      const links = ctx.getAttachments(AttachmentType.LINK);
      if (links.length === 1) {
        return links[0].url;
      }
      return undefined;
    })();
    if (command === undefined) {
      return fail;
    }
    return this.matchText(command);
  }

  createMapMenuMessage(
    server: OsuServer,
    beatmapId: number,
    getMapInfo: () => Promise<MapInfoWithContext<VkMessageContext> | undefined>
  ): MaybeDeferred<VkOutputMessage> {
    return MaybeDeferred.fromInstantPromise(
      (async () => {
        const mapInfoResult = await getMapInfo();
        const serverString = OsuServer[server];
        if (mapInfoResult === undefined) {
          return {
            text: `
[Server: ${serverString}]
Карта с ID ${beatmapId} не найдена
            `,
          };
        }
        const mapInfo = mapInfoResult.mapInfo;
        const modeString = OsuRuleset[mapInfo.mode];
        const artist = mapInfo.beatmapset.artist;
        const title = mapInfo.beatmapset.title;
        const diffname = mapInfo.version;
        const mapperName = mapInfo.beatmapset.creator;
        const mapStatus = mapInfo.beatmapset.status;
        const output: VkOutputMessage = {
          text: `
[Server: ${serverString}, Mode: ${modeString}]
${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
          `,
          buttons: this.createBeatmapButtons(
            server,
            beatmapId,
            hasLeaderboard(mapStatus)
          ),
        };
        const ctx = mapInfoResult.context;
        await this.saveLastSeenBeatmapId(ctx, server, mapInfo.id);
        return output;
      })()
    );
  }

  createBeatmapButtons(
    server: OsuServer,
    beatmapId: number,
    hasLeaderboard: boolean
  ): VkOutputMessageButton[][] {
    const buttons: VkOutputMessageButton[] = [];
    const mapInfoCommand = this.otherCommands.find(
      x => x instanceof BeatmapInfoVk
    );
    if (mapInfoCommand !== undefined) {
      buttons.push({
        text: 'Информация о карте',
        command: mapInfoCommand.unparse({
          server: server,
          beatmapId: beatmapId,
        }),
      });
    }
    if (!hasLeaderboard) {
      return buttons.map(x => [x]);
    }
    const userBestPlaysOnMapCommand = this.otherCommands.find(
      x => x instanceof UserBestPlaysOnMapVk
    );
    if (userBestPlaysOnMapCommand !== undefined) {
      buttons.push({
        text: 'Мой скор на карте',
        command: userBestPlaysOnMapCommand.unparse({
          server: server,
          beatmapId: beatmapId,
        }),
      });
    }
    const chatLeaderboardOnMapCommand = this.otherCommands.find(
      x => x instanceof ChatLeaderboardOnMapVk
    );
    if (chatLeaderboardOnMapCommand !== undefined) {
      buttons.push({
        text: 'Топ чата на карте',
        command: chatLeaderboardOnMapCommand.unparse({
          server: server,
          beatmapId: beatmapId,
        }),
      });
    }
    return buttons.map(x => [x]);
  }
}

function hasLeaderboard(mapStatus: BeatmapsetRankStatus) {
  switch (mapStatus) {
    case 'Graveyard':
      return false;
    case 'Wip':
      return false;
    case 'Pending':
      return false;
    case 'Ranked':
      return true;
    case 'Approved':
      return true;
    case 'Qualified':
      return true;
    case 'Loved':
      return true;
  }
}

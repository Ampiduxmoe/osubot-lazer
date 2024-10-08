/* eslint-disable no-irregular-whitespace */
import {AttachmentType} from 'vk-io';
import {APP_CODE_NAME} from '../../../App';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuServer} from '../../../primitives/OsuServer';
import {
  BeatmapMenu,
  BeatmapMenuExecutionArgs,
} from '../../commands/BeatmapMenu';
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
    beatmapId: number
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    return MaybeDeferred.fromValue({
      text: `[Server: ${serverString}]`,
      attachment: undefined,
      buttons: this.createBeatmapButtons(server, beatmapId),
    });
  }

  createBeatmapButtons(
    server: OsuServer,
    beatmapId: number
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

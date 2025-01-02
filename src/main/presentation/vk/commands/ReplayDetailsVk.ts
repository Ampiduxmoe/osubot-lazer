/* eslint-disable no-irregular-whitespace */
import axios from 'axios';
import {APP_CODE_NAME} from '../../../App';
import {GetBeatmapInfoUseCase} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {
  ReplayHitcounts,
  ReplayInfo,
} from '../../../application/usecases/parse_replay/ParseReplayResponse';
import {ParseReplayUseCase} from '../../../application/usecases/parse_replay/ParseReplayUseCase';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {
  GetInitiatorAppUserId,
  GetReplayFile,
} from '../../commands/common/Signatures';
import {
  ReplayDetails,
  ReplayDetailsExecutionArgs,
} from '../../commands/ReplayDetails';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class ReplayDetailsVk extends ReplayDetails<
  VkMessageContext,
  VkOutputMessage
> {
  constructor(
    parseReplayFile: ParseReplayUseCase,
    getInitiatorAppUserId: GetInitiatorAppUserId<VkMessageContext>,
    getBeatmapInfo: GetBeatmapInfoUseCase
  ) {
    const getReplayFile: GetReplayFile<VkMessageContext> = async ctx => {
      const replayAttachments = ctx
        .getAttachments('doc')
        .filter(doc => doc.extension === 'osr');
      const replayUrl = replayAttachments[0].url!;
      const {data: replayFile} = await axios.get(replayUrl, {
        responseType: 'arraybuffer',
      });
      return replayFile;
    };
    super(
      getReplayFile,
      parseReplayFile,
      getInitiatorAppUserId,
      getBeatmapInfo
    );
  }

  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ReplayDetailsExecutionArgs> {
    const fail = CommandMatchResult.fail<ReplayDetailsExecutionArgs>();
    if (!ctx.hasAttachments('doc')) {
      return fail;
    }
    const replayAttachments = ctx
      .getAttachments('doc')
      .filter(doc => doc.extension === 'osr');
    if (replayAttachments.length !== 1) {
      return fail;
    }
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    return this.matchText(command ?? '');
  }

  createReplayInfoMessage(
    replayInfo: ReplayInfo
  ): MaybeDeferred<VkOutputMessage> {
    return MaybeDeferred.fromValue(
      (() => {
        const mode = replayInfo.mode;
        const playerName = replayInfo.playerName;
        const hitcounts = replayInfo.hitcounts;
        const score = replayInfo.score;
        const combo = replayInfo.combo;
        const modeString = OsuRuleset[mode];
        const comboString = `${combo}x`;
        const acc = (replayInfo.accuracy * 100).toFixed(2);
        const modsString =
          replayInfo.mods.length === 0 ? '' : ` +${replayInfo.mods.join('')}`;
        const hitcountsString = getHitcountsString(hitcounts, mode);
        return {
          text: `
[Mode: ${modeString}]

Реплей игрока ${playerName}${modsString}
Score: ${score}　Combo: ${comboString}
Accuracy: ${acc}%
Hitcounts: ${hitcountsString}

          `,
        };
      })()
    );
  }
}

function getHitcountsString(c: ReplayHitcounts, mode: OsuRuleset) {
  if (mode === OsuRuleset.osu) {
    return `${c.c300}/${c.c100}/${c.c50}/${c.miss}`;
  }
  if (mode === OsuRuleset.taiko) {
    return `${c.c300}/${c.c100}/${c.miss}`;
  }
  if (mode === OsuRuleset.ctb) {
    return `${c.c300}/${c.c100}/${c.c50}/${c.miss}`;
  }
  if (mode === OsuRuleset.mania) {
    return `${c.geki}/${c.c300}/${c.katu}/${c.c100}/${c.c50}/${c.miss}`;
  }
  throw Error('Unknown game mode');
}

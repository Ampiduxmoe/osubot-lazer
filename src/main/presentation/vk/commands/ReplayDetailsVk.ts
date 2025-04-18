/* eslint-disable no-irregular-whitespace */
import axios from 'axios';
import {APP_CODE_NAME} from '../../../App';
import {
  BeatmapsetRankStatus,
  MapInfo,
} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {GetBeatmapInfoUseCase} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoUseCase';
import {
  ReplayHitcounts,
  ReplayInfo,
} from '../../../application/usecases/parse_replay/ParseReplayResponse';
import {ParseReplayUseCase} from '../../../application/usecases/parse_replay/ParseReplayUseCase';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {Timespan} from '../../../primitives/Timespan';
import {
  GetInitiatorAppUserId,
  GetReplayFile,
  SaveLastSeenBeatmapId,
} from '../../commands/common/Signatures';
import {
  ReplayDetails,
  ReplayDetailsExecutionArgs,
} from '../../commands/ReplayDetails';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkBeatmapCoversRepository} from '../../data/repositories/VkBeatmapCoversRepository';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage, VkOutputMessageButton} from '../VkOutputMessage';
import {ChatLeaderboardOnMapVk} from './ChatLeaderboardOnMapVk';
import {UserBestPlaysOnMapVk} from './UserBestPlaysOnMapVk';

export class ReplayDetailsVk extends ReplayDetails<
  VkMessageContext,
  VkOutputMessage
> {
  constructor(
    protected vkBeatmapCovers: VkBeatmapCoversRepository,
    parseReplayFile: ParseReplayUseCase,
    getInitiatorAppUserId: GetInitiatorAppUserId<VkMessageContext>,
    getBeatmapInfo: GetBeatmapInfoUseCase,
    saveLastSeenBeatmapId: SaveLastSeenBeatmapId<VkMessageContext>
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
      getBeatmapInfo,
      saveLastSeenBeatmapId
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
    replayInfo: ReplayInfo,
    mapInfo: MapInfo
  ): MaybeDeferred<VkOutputMessage> {
    return MaybeDeferred.fromFastPromise(
      (async () => {
        const coverAttachment = await getOrDownloadCoverAttachment(
          OsuServer.Bancho,
          mapInfo,
          this.vkBeatmapCovers
        );
        const mode = replayInfo.mode;
        const playerName = replayInfo.playerName;
        const hitcounts = replayInfo.hitcounts;
        const score = replayInfo.score;
        const combo = replayInfo.combo;
        const maxCombo = mapInfo.maxCombo;
        const {artist, title} = mapInfo.beatmapset;
        const diffname = mapInfo.version;
        const mapperName = mapInfo.beatmapset.creator;
        const mapStatus = mapInfo.beatmapset.status;
        const [lengthString, drainString] = (() => {
          const totalLength = new Timespan().addSeconds(mapInfo.totalLength);
          const z0 = totalLength.minutes <= 9 ? '0' : '';
          const z1 = totalLength.seconds <= 9 ? '0' : '';
          const drainLength = new Timespan().addSeconds(mapInfo.hitLength);
          const z2 = drainLength.minutes <= 9 ? '0' : '';
          const z3 = drainLength.seconds <= 9 ? '0' : '';
          const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
          const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
          return [lengthString, drainString];
        })();
        const bpm = round(mapInfo.bpm, 2);
        const sr = mapInfo.starRating?.toFixed(2) ?? '—';
        const modeString = OsuRuleset[mode];
        const comboString = `${combo}x/${maxCombo}x`;
        const acc = (replayInfo.accuracy * 100).toFixed(2);
        const modsString =
          replayInfo.mods.length === 0 ? '' : `+${replayInfo.mods.join('')}`;
        const ppValue = mapInfo.ppEstimations.at(0)?.ppValue?.toFixed(2);
        const pp = ppValue === undefined ? '—' : `~${ppValue}`;
        const hitcountsString = getHitcountsString(hitcounts, mode);
        const scoreDateString = getScoreDateString(
          new Date(replayInfo.timestamp)
        );
        const mapUrlShort = mapInfo.url.replace('beatmaps', 'b');
        const couldNotAttachCoverMessage =
          coverAttachment === undefined
            ? '\n\nБГ карты прикрепить не удалось 😭'
            : '';
        return {
          text: `
[Mode: ${modeString}]
Реплей игрока ${playerName}

${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsString}

Score: ${score}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${pp}
Hitcounts: ${hitcountsString}
${scoreDateString}

Beatmap: ${mapUrlShort}${couldNotAttachCoverMessage}
          `.trim(),
          attachment: coverAttachment ?? undefined,
          buttons: this.createBeatmapButtons(
            OsuServer.Bancho,
            mapInfo.id,
            hasLeaderboard(mapInfo.beatmapset.status)
          ),
        };
      })()
    );
  }

  createReplayInfoWithoutMapMessage(
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
          replayInfo.mods.length === 0 ? '' : ` (+${replayInfo.mods.join('')})`;
        const scoreDateString = getScoreDateString(
          new Date(replayInfo.timestamp)
        );
        const hitcountsString = getHitcountsString(hitcounts, mode);
        return {
          text: `
[Mode: ${modeString}]

Реплей игрока ${playerName}${modsString}

Score: ${score}　Combo: ${comboString}
Accuracy: ${acc}%
Hitcounts: ${hitcountsString}
${scoreDateString}

Информацию о карте найти не удалось
          `.trim(),
        };
      })()
    );
  }

  createBeatmapButtons(
    server: OsuServer,
    beatmapId: number,
    hasLeaderboard: boolean
  ): VkOutputMessageButton[][] | undefined {
    if (!hasLeaderboard) {
      return undefined;
    }
    const buttons: VkOutputMessageButton[] = [];
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

type CoverAttachment = string | null | undefined;

async function getOrDownloadCoverAttachment(
  server: OsuServer,
  mapInfo: MapInfo,
  coversRepository: VkBeatmapCoversRepository
): Promise<CoverAttachment> {
  const existingAttachment = await coversRepository.get({
    server: server,
    beatmapsetId: mapInfo.beatmapset.id,
  });
  if (existingAttachment !== undefined) {
    return existingAttachment.attachment;
  }
  try {
    const newAttachment = await coversRepository.uploadAndSave(
      server,
      mapInfo.beatmapset.id,
      mapInfo.beatmapset.coverUrl
    );
    if (newAttachment === undefined) {
      return null;
    }
    return newAttachment;
  } catch (e) {
    return undefined;
  }
}

function getScoreDateString(date: Date): string {
  const day = date.getUTCDate();
  const dayFormatted = (day > 9 ? '' : '0') + day;
  const month = date.getUTCMonth() + 1;
  const monthFormatted = (month > 9 ? '' : '0') + month;
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours();
  const hoursFormatted = (hours > 9 ? '' : '0') + hours;
  const minutes = date.getUTCMinutes();
  const minutesFormatted = (minutes > 9 ? '' : '0') + minutes;
  const datePart = `${dayFormatted}.${monthFormatted}.${year}`;
  const timePart = `${hoursFormatted}:${minutesFormatted}`;
  return `${datePart} ${timePart}`;
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

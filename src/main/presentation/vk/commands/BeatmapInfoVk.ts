/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {
  BeatmapsetRankStatus,
  MapInfo,
} from '../../../application/usecases/get_beatmap_info/GetBeatmapInfoResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {integerShortForm, round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {Timespan} from '../../../primitives/Timespan';
import {
  BeatmapInfo,
  BeatmapInfoExecutionArgs,
  BeatmapInfoViewParams,
} from '../../commands/BeatmapInfo';
import {DiffBrief} from '../../commands/common/DiffBrief';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkBeatmapCoversRepository} from '../../data/repositories/VkBeatmapCoversRepository';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage, VkOutputMessageButton} from '../VkOutputMessage';
import {ChatLeaderboardOnMapVk} from './ChatLeaderboardOnMapVk';
import {UserBestPlaysOnMapVk} from './UserBestPlaysOnMapVk';

export class BeatmapInfoVk extends BeatmapInfo<
  VkMessageContext,
  VkOutputMessage
> {
  constructor(
    protected vkBeatmapCovers: VkBeatmapCoversRepository,
    ...parentParams: ConstructorParameters<
      typeof BeatmapInfo<VkMessageContext, VkOutputMessage>
    >
  ) {
    super(...parentParams);
  }
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<BeatmapInfoExecutionArgs> {
    const fail = CommandMatchResult.fail<BeatmapInfoExecutionArgs>();
    const command: string | undefined = (() => {
      if (ctx.messagePayload?.target === APP_CODE_NAME) {
        return ctx.messagePayload.command;
      }
      return ctx.text;
    })();
    if (command === undefined) {
      return fail;
    }
    return this.matchText(command);
  }

  createMapInfoMessage(
    server: OsuServer,
    mapInfo: MapInfo,
    beatmapsetDiffs: DiffBrief[],
    getViewParamsForMap: (mapId: number) => Promise<BeatmapInfoViewParams> // TODO: come up with a way to avoid this
  ): MaybeDeferred<VkOutputMessage> {
    const valuePromise: Promise<VkOutputMessage> = (async () => {
      const coverAttachment = await getOrDownloadCoverAttachment(
        server,
        mapInfo,
        this.vkBeatmapCovers
      );
      const serverString = OsuServer[server];
      const modeString = OsuRuleset[mapInfo.mode];
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
      const sr = mapInfo.starRating.toFixed(2);
      const {ar, cs, od, hp} = mapInfo;
      const mapPlaycount = integerShortForm(mapInfo.playcount);
      const totalPlaycount = integerShortForm(mapInfo.beatmapset.playcount);
      const totalFavcount = integerShortForm(mapInfo.beatmapset.favouriteCount);
      const ppEstimations = mapInfo.ppEstimations
        .map(x => {
          const acc = round(x.accuracy, 2);
          const pp = x.ppValue?.toFixed(0);
          const ppString = pp === undefined ? '—' : `~${pp}pp`;
          return `${acc}%: ${ppString}`;
        })
        .join('　');
      const mapUrlShort = mapInfo.url.replace('beatmaps', 'b');
      const couldNotAttachCoverMessage =
        coverAttachment === undefined
          ? '\n\nБГ карты прикрепить не удалось 😭'
          : '';
      const text = `
[Server: ${serverString}, Mode: ${modeString}]
${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
▷ ${totalPlaycount} [${mapPlaycount}]　♡ ${totalFavcount}

${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
${ppEstimations}

URL: ${mapUrlShort}${couldNotAttachCoverMessage}
      `.trim();
      const currentDiff = beatmapsetDiffs.find(x => x.id === mapInfo.id);
      if (currentDiff === undefined) {
        throw Error(
          'Could not find current difficulty in a list of beatmapset difficulties'
        );
      }
      const commonDiffButtonText = (diff: DiffBrief): string =>
        `(${diff.starRating}★) ${diff.diffName}`;
      const generateMessageForMap = (
        mapId: number
      ): MaybeDeferred<VkOutputMessage> =>
        MaybeDeferred.fromFastPromise(
          (async () => {
            const viewParams = await getViewParamsForMap(mapId);
            return await this.createOutputMessage(viewParams).resultValue;
          })()
        );
      const generateMessageForAllDiffs = (
        pageIndex: number
      ): MaybeDeferred<VkOutputMessage> =>
        MaybeDeferred.fromValue(
          (() => {
            const maxDiffsNoPagination = 5;
            const maxDiffsOnPage = 4;
            const maxPageIndex =
              beatmapsetDiffs.length <= maxDiffsNoPagination
                ? 0
                : Math.floor(beatmapsetDiffs.length / maxDiffsOnPage);
            const paginationButtons = (() => {
              if (beatmapsetDiffs.length <= maxDiffsNoPagination) {
                return [];
              }
              const result: {
                text: string;
                generateMessage: () => MaybeDeferred<VkOutputMessage>;
              }[] = [];
              if (pageIndex > 0) {
                result.push({
                  text: '◀ Предыдущие',
                  generateMessage: () =>
                    generateMessageForAllDiffs(pageIndex - 1),
                });
              }
              if (pageIndex < maxPageIndex) {
                result.push({
                  text: 'Следующие ▶',
                  generateMessage: () =>
                    generateMessageForAllDiffs(pageIndex + 1),
                });
              }
              return [result];
            })();
            const pageText = `${artist} - ${title} by ${mapperName}`;
            const diffsToShow =
              maxPageIndex === 0
                ? beatmapsetDiffs
                : beatmapsetDiffs.slice(
                    pageIndex * maxDiffsOnPage,
                    (pageIndex + 1) * maxDiffsOnPage
                  );
            return {
              navigation: {
                currentContent: {
                  text: pageText,
                },
                navigationButtons: diffsToShow
                  .map(diff => [
                    {
                      text: commonDiffButtonText(diff),
                      generateMessage: () => generateMessageForMap(diff.id),
                    },
                  ])
                  .concat([
                    ...paginationButtons,
                    [
                      {
                        text: 'Назад',
                        generateMessage: () =>
                          generateMessageForMap(mapInfo.id),
                      },
                    ],
                  ]),
              },
            };
          })()
        );
      return {
        navigation: {
          currentContent: {
            text: text,
            attachment: coverAttachment ?? undefined,
            buttons: this.createBeatmapButtons(
              server,
              mapInfo.id,
              hasLeaderboard(mapInfo.beatmapset.status)
            ),
          },
          navigationButtons:
            beatmapsetDiffs.length === 1
              ? undefined
              : [
                  [
                    {
                      text: 'Выбрать другую диффу',
                      generateMessage: () => generateMessageForAllDiffs(0),
                    },
                  ],
                ],
        },
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createSimulatedScoreInfoMessage(
    server: OsuServer,
    mapInfo: MapInfo
  ): MaybeDeferred<VkOutputMessage> {
    const valuePromise: Promise<VkOutputMessage> = (async () => {
      if (mapInfo.simulationParams === undefined) {
        throw Error('Simulated stats should not be undefined');
      }
      const coverAttachment = await getOrDownloadCoverAttachment(
        server,
        mapInfo,
        this.vkBeatmapCovers
      );
      const simulatedStats = mapInfo.simulationParams;
      let speed = 1;
      const htLike = simulatedStats.mods.find(m => m.isAnyOf('HT', 'DC'));
      if (htLike !== undefined) {
        if (simulatedStats.speed !== undefined) {
          speed = simulatedStats.speed;
        } else {
          speed = 0.75;
        }
      }
      const dtLike = simulatedStats.mods.find(m => m.isAnyOf('DT', 'NC'));
      if (dtLike !== undefined) {
        if (simulatedStats.speed !== undefined) {
          speed = simulatedStats.speed;
        } else {
          speed = 1.5;
        }
      }
      const speedString = [1, 0.75, 1.5].includes(speed)
        ? ''
        : ` (${round(speed, 2)}x)`;
      const serverString = OsuServer[server];
      const modeString = OsuRuleset[mapInfo.mode];
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
      const mods = simulatedStats.mods;
      const modsString = mods.length === 0 ? '' : '+' + mods.join('');
      const sr = mapInfo.starRating.toFixed(2);
      const acc = simulatedStats.accuracy.toFixed(2);
      const {misses, mehs} = simulatedStats;
      const hitcountsString = (() => {
        if (mapInfo.mode !== OsuRuleset.osu) {
          return `${misses}xMiss`;
        }
        return `${misses}xMiss　${mehs}x50`;
      })();
      const comboString = `${simulatedStats.combo}x/${mapInfo.maxCombo}x`;
      const ar = round(mapInfo.ar, 2);
      const cs = round(mapInfo.cs, 2);
      const od = round(mapInfo.od, 2);
      const hp = round(mapInfo.hp, 2);
      const mapPlaycount = integerShortForm(mapInfo.playcount);
      const totalPlaycount = integerShortForm(mapInfo.beatmapset.playcount);
      const totalFavcount = integerShortForm(mapInfo.beatmapset.favouriteCount);
      const ppEstimation = mapInfo.ppEstimations.map(x => {
        const pp = x.ppValue?.toFixed(0);
        const ppString = pp === undefined ? '—' : `~${pp}pp`;
        return `${ppString}`;
      })[0];
      const mapUrlShort = mapInfo.url.replace('beatmaps', 'b');
      const couldNotAttachCoverMessage =
        coverAttachment === undefined
          ? '\n\nБГ карты прикрепить не удалось 😭'
          : '';
      const text = `
[Server: ${serverString}, Mode: ${modeString}]
${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
▷ ${totalPlaycount} [${mapPlaycount}]　♡ ${totalFavcount}

${modsString}${speedString}
${acc}%　${hitcountsString}　${comboString}
${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
${ppEstimation}

URL: ${mapUrlShort}${couldNotAttachCoverMessage}
      `.trim();
      return {
        text: text,
        attachment: coverAttachment ?? undefined,
        buttons: this.createBeatmapButtons(
          server,
          mapInfo.id,
          hasLeaderboard(mapInfo.beatmapset.status)
        ),
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  createMapNotFoundMessage(
    server: OsuServer,
    beatmapIdInput: number
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Карта ${beatmapIdInput} не найдена
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
  }

  createMapIdNotSpecifiedMessage(
    server: OsuServer
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Не указан ID карты / не найдено последней карты в истории чата
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
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

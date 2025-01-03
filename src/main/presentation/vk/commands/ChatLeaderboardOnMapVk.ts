/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {
  OsuMap,
  OsuMapUserBestPlays,
  OsuMapUserPlay,
} from '../../../application/usecases/get_beatmap_users_best_score/GetBeatmapUsersBestScoresResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {ModAcronym} from '../../../primitives/ModAcronym';
import {round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {Timespan} from '../../../primitives/Timespan';
import {
  ChatLeaderboardOnMap,
  ChatLeaderboardOnMapExecutionArgs,
} from '../../commands/ChatLeaderboardOnMap';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage, VkOutputMessageContent} from '../VkOutputMessage';

export class ChatLeaderboardOnMapVk extends ChatLeaderboardOnMap<
  VkMessageContext,
  VkOutputMessage
> {
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<ChatLeaderboardOnMapExecutionArgs> {
    const fail = CommandMatchResult.fail<ChatLeaderboardOnMapExecutionArgs>();
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

  createMapPlaysMessage(
    map: OsuMap,
    mapPlays: OsuMapUserBestPlays[],
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[],
    isChatLb: boolean
  ): MaybeDeferred<VkOutputMessage> {
    let currentFilterMods: ModAcronym[] = [];
    let currentPageIndex = 0;
    const computeOutput = (): VkOutputMessage => {
      const sortedMapPlays = mapPlays
        .sort((a, b) => {
          const aPlayResult = a.collection[0].playResult;
          const bPlayResult = b.collection[0].playResult;
          const aPp = aPlayResult.pp.estimatedValue ?? 0;
          const bPp = bPlayResult.pp.estimatedValue ?? 0;
          if (aPp === bPp) {
            const aScore = aPlayResult.totalScore;
            const bScore = bPlayResult.totalScore;
            if (aScore === bScore) {
              return aPlayResult.date - bPlayResult.date;
            }
            return bScore - aScore;
          }
          return bPp - aPp;
        })
        .map(v => {
          const filteredPlays: {
            playResult: OsuMapUserPlay;
            mapInfo: OsuMap;
          }[] = [];
          for (const play of v.collection) {
            const satisfiesFilter = ModAcronym.listContainsAll(
              currentFilterMods,
              play.playResult.mods.map(m => m.acronym)
            );
            if (satisfiesFilter) {
              filteredPlays.push(play);
            }
          }
          if (filteredPlays.length === 0) {
            return undefined;
          }
          return {
            ...v,
            collection: filteredPlays,
          };
        })
        .filter(v => v !== undefined)
        .map((v, i) => ({position: i + 1, mapPlays: v}));
      const maxScoresPerPage = 5;
      const playsChunks: {
        position: number;
        mapPlays: OsuMapUserBestPlays;
      }[][] = [];
      for (let i = 0; i < sortedMapPlays.length; i += maxScoresPerPage) {
        playsChunks.push(sortedMapPlays.slice(i, i + maxScoresPerPage));
      }
      const pageContents: VkOutputMessageContent[] = playsChunks.map(chunk => {
        const areAllMapsInChunkSame: boolean = (() => {
          for (let i = 1; i < chunk.length; i++) {
            if (
              areMapsDifferentInStats(
                chunk[0].mapPlays.collection[0].mapInfo,
                chunk[i].mapPlays.collection[0].mapInfo
              )
            ) {
              return false;
            }
          }
          return true;
        })();
        const text = this.createMapPlaysText(
          areAllMapsInChunkSame ? chunk[0].mapPlays.collection[0].mapInfo : map,
          chunk,
          maxScoresPerPage,
          server,
          mode,
          missingUsernames,
          isChatLb,
          currentFilterMods
        );
        const fullText = `${text}`;
        return {
          text: fullText,
        };
      });
      const availableFilterMods: ModAcronym[] = (() => {
        const allPlaysModCombos = sortedMapPlays.flatMap(v =>
          v.mapPlays.collection.map(collection =>
            collection.playResult.mods.map(m => m.acronym)
          )
        );
        const modFrequencies: {[key: string]: number} = {};
        for (const modCombo of allPlaysModCombos) {
          for (const mod of modCombo) {
            const modKey = mod.toString();
            if (modFrequencies[modKey] === undefined) {
              modFrequencies[modKey] = 0;
            }
            modFrequencies[modKey] += 1;
          }
        }
        const modsByPopularity = Object.entries(modFrequencies).sort(
          (a, b) => b[1] - a[1]
        );
        return modsByPopularity
          .filter(entry => entry[1] < allPlaysModCombos.length)
          .map(entry => new ModAcronym(entry[0]))
          .filter(m => !m.isAnyOf(...currentFilterMods));
      })();
      // Max 10 buttons per message, so we only have 8 or 7 slots for
      // mod filter buttons (10 minus pagination buttons minus clear filter button)
      const modFilterRows = (() => {
        if (availableFilterMods.length < 5) {
          return [availableFilterMods];
        }
        if (availableFilterMods.length < 7) {
          return [
            availableFilterMods.slice(0, 3),
            availableFilterMods.slice(3),
          ];
        }
        const availableSlotsForMods = currentFilterMods.length > 0 ? 7 : 8;
        return [
          availableFilterMods.slice(0, 4),
          availableFilterMods.slice(4, availableSlotsForMods),
        ];
      })();
      return {
        navigation: {
          currentContent: pageContents[currentPageIndex],
          navigationButtons: [
            [
              ...(currentPageIndex <= 0
                ? []
                : [
                    {
                      text: `(${currentPageIndex}/${playsChunks.length})　◀`,
                      generateMessage: () => {
                        currentPageIndex -= 1;
                        return MaybeDeferred.fromValue(computeOutput());
                      },
                    },
                  ]),
              ...(currentPageIndex >= pageContents.length - 1
                ? []
                : [
                    {
                      text: `▶　(${currentPageIndex + 2}/${playsChunks.length})`,
                      generateMessage: () => {
                        currentPageIndex += 1;
                        return MaybeDeferred.fromValue(computeOutput());
                      },
                    },
                  ]),
            ],
            ...modFilterRows.map(modRow =>
              modRow.map(mod => ({
                text: `+${mod}`,
                generateMessage: () => {
                  currentPageIndex = 0;
                  currentFilterMods.push(mod);
                  return MaybeDeferred.fromValue(computeOutput());
                },
              }))
            ),
            ...(currentFilterMods.length === 0
              ? []
              : [
                  [
                    {
                      text: 'Очистить фильтр',
                      generateMessage: () => {
                        currentPageIndex = 0;
                        currentFilterMods = [];
                        return MaybeDeferred.fromValue(computeOutput());
                      },
                    },
                  ],
                ]),
          ],
        },
      };
    };
    return MaybeDeferred.fromValue(computeOutput());
  }

  createMapPlaysText(
    map: OsuMap,
    mapPlaysData: {position: number; mapPlays: OsuMapUserBestPlays}[],
    targetQuantity: number,
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[],
    isChatLb: boolean,
    modFilter: ModAcronym[]
  ): string {
    const displayedMap = map;
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const {artist, title} = displayedMap.beatmapset;
    const diffname = displayedMap.beatmap.difficultyName;
    const mapperName = displayedMap.beatmapset.creator;
    const mapStatus = displayedMap.beatmapset.status;
    const [lengthString, drainString] = (() => {
      const totalLength = new Timespan().addSeconds(
        displayedMap.beatmap.totalLength
      );
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(
        displayedMap.beatmap.drainLength
      );
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
      return [lengthString, drainString];
    })();
    const bpm = round(displayedMap.beatmap.bpm, 2);
    const sr = displayedMap.beatmap.estimatedStarRating?.toFixed(2) ?? '—';
    const ar = round(displayedMap.beatmap.ar, 2);
    const cs = round(displayedMap.beatmap.cs, 2);
    const od = round(displayedMap.beatmap.od, 2);
    const hp = round(displayedMap.beatmap.hp, 2);
    const maxCombo = displayedMap.beatmap.maxCombo;
    const fewScores = targetQuantity <= 5;
    const scoresText = mapPlaysData
      .map(({position, mapPlays}) =>
        fewScores
          ? this.verboseScoreDescription(
              position,
              mapPlays.username,
              mapPlays.collection[0].playResult
            )
          : this.shortScoreDescription(
              position,
              mapPlays.username,
              mapPlays.collection[0].playResult
            )
      )
      .join(fewScores ? '\n' : '\n');
    const couldNotGetSomeStatsMessage =
      mapPlaysData.find(
        ({mapPlays}) =>
          mapPlays.collection[0].playResult.pp.estimatedValue === undefined
      ) !== undefined
        ? '\n(Не удалось получить часть статистики)'
        : '';
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const mapUrlShort = displayedMap.beatmap.url.replace('beatmaps', 'b');
    const modFilterString =
      modFilter.length === 0 ? '' : ` (фильтр: ${modFilter.join(', ')})`;
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Топ ${isChatLb ? 'чата' : 'выбранных игроков'} на карте${modFilterString}

${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
${lengthString} (${drainString})　${bpm} BPM　${sr}★
AR: ${ar}　CS: ${cs}　OD: ${od}　HP: ${hp}
Max combo: ${maxCombo}x
${mapUrlShort}

${scoresText}
${couldNotGetSomeStatsMessage}
${missingUsernamesMessage}
    `.trim();
    return text;
  }

  verboseScoreDescription(
    pos: number,
    username: string,
    play: OsuMapUserPlay
  ): string {
    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed = (dtMod.settings as {speedChange: number}).speedChange ?? 1.5;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed = (htMod.settings as {speedChange: number}).speedChange ?? 0.75;
    }

    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.length > 0 ? '+' + modAcronyms.join('') : '';
    const defaultSpeeds = [1, 1.5, 0.75];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    const combo = play.combo;
    const totalScore = play.totalScore;
    const dateString = getScoreDateString(new Date(play.date));
    const comboString = `${combo}x`;
    const misses = play.orderedHitcounts[play.orderedHitcounts.length - 1];
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(2);
    const ppValueEstimation = play.pp.estimatedValue?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    return `
${pos}. ${username}　${modsString}
　 ${acc}%　${misses}X　${ppEstimationMark}${pp}pp
　 ${totalScore}　${comboString}　${dateString}
    `.trim();
  }

  shortScoreDescription(
    pos: number,
    username: string,
    play: OsuMapUserPlay
  ): string {
    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed = (dtMod.settings as {speedChange: number}).speedChange ?? 1.5;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed = (htMod.settings as {speedChange: number}).speedChange ?? 0.75;
    }

    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.length > 0 ? '+' + modAcronyms.join('') : '';
    const defaultSpeeds = [1, 1.5, 0.75];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    const combo = play.combo;
    const comboString = `${combo}x`;
    const misses = play.orderedHitcounts[play.orderedHitcounts.length - 1];
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(0);
    const ppValueEstimation = play.pp.estimatedValue?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    return `
${pos}. ${username}　${modsString}
　 ${acc}%　${misses}X　${comboString}　${ppEstimationMark}${pp}pp
    `.trim();
  }

  createMapNotFoundMessage(
    server: OsuServer,
    mapId: number
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Карта ${mapId} не найдена
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
  }

  createNoUsernamesMessage(server: OsuServer): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Невозможно выполнить команду для пустого списка игроков!
Привяжите ник к аккаунту или укажите список ников для отображения
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
  }

  createBeatmapIdNotSpecifiedMessage(
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

  createNoMapPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    missingUsernames: string[]
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const missingUsernamesMessage =
      missingUsernames.length > 0
        ? '\nНе удалось найти игроков с никами:\n' + missingUsernames.join(', ')
        : '';
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Скоры на карте не найдены

${missingUsernamesMessage}
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
  }
}

function getScoreDateString(date: Date): string {
  const day = date.getUTCDate();
  const dayFormatted = (day > 9 ? '' : '0') + day;
  const month = date.getUTCMonth() + 1;
  const monthFormatted = (month > 9 ? '' : '0') + month;
  const year = date.getUTCFullYear();
  const datePart = `${dayFormatted}.${monthFormatted}.${year}`;
  return `${datePart}`;
}

function areMapsDifferentInStats(a: OsuMap, b: OsuMap): boolean {
  const keyStats: (keyof OsuMap['beatmap'])[] = [
    'totalLength',
    'drainLength',
    'bpm',
    'estimatedStarRating',
    'ar',
    'cs',
    'od',
    'hp',
    'maxCombo',
  ];
  for (const stat of keyStats) {
    if (a.beatmap[stat] !== b.beatmap[stat]) {
      return true;
    }
  }
  return false;
}

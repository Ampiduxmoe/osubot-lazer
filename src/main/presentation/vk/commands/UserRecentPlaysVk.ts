/* eslint-disable no-irregular-whitespace */
import {APP_CODE_NAME} from '../../../App';
import {
  BeatmapsetRankStatus,
  OsuUserRecentPlay,
  OsuUserRecentPlays,
  SettingsDA,
  SettingsDT,
  SettingsDefaults,
  SettingsHT,
} from '../../../application/usecases/get_user_recent_plays/GetUserRecentPlaysResponse';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {round} from '../../../primitives/Numbers';
import {OsuRuleset} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {VK_REPLY_PROCESSING} from '../../../primitives/Strings';
import {Timespan} from '../../../primitives/Timespan';
import {LinkUsernameResult} from '../../commands/common/LinkUsernameResult';
import {
  UserRecentPlays,
  UserRecentPlaysExecutionArgs,
  UserRecentPlaysViewParams,
} from '../../commands/UserRecentPlays';
import {USERNAME} from '../../common/arg_processing/CommandArguments';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkBeatmapCoversRepository} from '../../data/repositories/VkBeatmapCoversRepository';
import {VkMessageContext} from '../VkMessageContext';
import {
  VkNavigationCaption,
  VkOutputMessage,
  VkOutputMessageButton,
} from '../VkOutputMessage';
import {ChatLeaderboardOnMapVk} from './ChatLeaderboardOnMapVk';
import {DynamicLinkUsernamePageGeneratorVk} from './common/DynamicLinkUsernamePageGenerator';
import {UserBestPlaysOnMapVk} from './UserBestPlaysOnMapVk';

export class UserRecentPlaysVk extends UserRecentPlays<
  VkMessageContext,
  VkOutputMessage
> {
  constructor(
    protected vkBeatmapCovers: VkBeatmapCoversRepository,
    ...parentParams: ConstructorParameters<
      typeof UserRecentPlays<VkMessageContext, VkOutputMessage>
    >
  ) {
    super(...parentParams);
  }
  matchMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<UserRecentPlaysExecutionArgs> {
    const fail = CommandMatchResult.fail<UserRecentPlaysExecutionArgs>();
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

  createRecentPlaysMessage(
    recentPlays: OsuUserRecentPlays,
    server: OsuServer,
    mode: OsuRuleset,
    passesOnly: boolean
  ): MaybeDeferred<VkOutputMessage> {
    const valuePromise: Promise<VkOutputMessage> = (async () => {
      const serverString = OsuServer[server];
      const modeString = OsuRuleset[mode];
      const oneScore = recentPlays.plays.length === 1;
      const passesString = oneScore ? 'Последний пасс' : 'Последние пассы';
      const scoresString = oneScore ? 'Последний скор' : 'Последние скоры';
      const username = recentPlays.username;
      const scoreDescriptions = recentPlays.plays.map(p =>
        oneScore
          ? this.verboseScoreDescription(p)
          : this.shortScoreDescription(p)
      );
      const couldNotGetSomeStatsMessage =
        recentPlays.plays.find(
          play => play.beatmap.estimatedStarRating === undefined
        ) !== undefined
          ? '\n(Не удалось получить часть статистики)'
          : '';
      const coverAttachment = oneScore
        ? await getOrDownloadCoverAttachment(
            server,
            recentPlays.plays[0],
            this.vkBeatmapCovers
          )
        : null;
      const scoresText = (await Promise.all(scoreDescriptions)).join('\n\n');
      const couldNotAttachCoverMessage =
        coverAttachment === undefined
          ? '\n\nБГ карты прикрепить не удалось 😭'
          : '';
      const text = `
[Server: ${serverString}, Mode: ${modeString}]
${passesOnly ? passesString : scoresString} ${username}

${scoresText}
${couldNotGetSomeStatsMessage}${couldNotAttachCoverMessage}
      `.trim();
      return {
        text: text,
        attachment: coverAttachment ?? undefined,
        buttons: oneScore
          ? this.createBeatmapButtons(
              server,
              recentPlays.plays[0].beatmap.id,
              hasLeaderboard(recentPlays.plays[0].beatmapset.status)
            )
          : undefined,
      };
    })();
    return MaybeDeferred.fromFastPromise(valuePromise);
  }

  async verboseScoreDescription(play: OsuUserRecentPlay): Promise<string> {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.is('DT'));
    if (dtMod !== undefined) {
      speed =
        (dtMod.settings as SettingsDT)?.speedChange ??
        SettingsDefaults.DT.speedChange!;
    }
    const htMod = play.mods.find(m => m.acronym.is('HT'));
    if (htMod !== undefined) {
      speed =
        (htMod.settings as SettingsHT)?.speedChange ??
        SettingsDefaults.HT.speedChange!;
    }
    const [arAsterisk, csAsterisk, odAsterisk, hpAsterisk] = (() => {
      const daMod = play.mods.find(m => m.acronym.is('DA'));
      const settings = daMod?.settings as SettingsDA | undefined;
      return [
        settings?.ar === undefined ? '' : '*',
        settings?.cs === undefined ? '' : '*',
        settings?.od === undefined ? '' : '*',
        settings?.hp === undefined ? '' : '*',
      ];
    })();

    const absPos = `${play.absolutePosition}`;
    const {artist, title} = mapset;
    const diffname = map.difficultyName;
    const mapperName = mapset.creator;
    const mapStatus = mapset.status;
    const [lengthString, drainString] = (() => {
      const totalLength = new Timespan().addSeconds(map.totalLength);
      const z0 = totalLength.minutes <= 9 ? '0' : '';
      const z1 = totalLength.seconds <= 9 ? '0' : '';
      const drainLength = new Timespan().addSeconds(map.drainLength);
      const z2 = drainLength.minutes <= 9 ? '0' : '';
      const z3 = drainLength.seconds <= 9 ? '0' : '';
      const lengthString = `${z0}${totalLength.minutes}:${z1}${totalLength.seconds}`;
      const drainString = `${z2}${drainLength.minutes}:${z3}${drainLength.seconds}`;
      return [lengthString, drainString];
    })();
    const bpm = round(map.bpm, 2);
    const sr = (await play.beatmap.estimatedStarRating)?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.join('');
    const defaultSpeeds = [
      1,
      SettingsDefaults.DT.speedChange,
      SettingsDefaults.HT.speedChange,
    ];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const ar = round(play.beatmap.ar, 2);
    const cs = round(play.beatmap.cs, 2);
    const od = round(play.beatmap.od, 2);
    const hp = round(play.beatmap.hp, 2);
    const {totalScore} = play;
    const combo = play.combo;
    const max_combo = play.beatmap.maxCombo;
    const comboString = `${combo}x/${max_combo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(2);
    const ppValueEstimation = (await play.pp.estimatedValue)?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    const ppFcValue = await play.pp.ifFc;
    const ppSsValue = await play.pp.ifSs;
    const ppFc = ppFcValue === undefined ? '—' : `~${ppFcValue.toFixed(0)}`;
    const ppSs = ppSsValue === undefined ? '—' : `~${ppSsValue.toFixed(0)}`;
    const ppForFcAndSsString = [play.pp.ifFc, play.pp.ifSs].includes(undefined)
      ? ''
      : `　FC: ${ppFc}　SS: ${ppSs}`;
    const hitcounts = play.orderedHitcounts;
    const hitcountsString = hitcounts.join('/');
    const {grade} = play;
    const mapProgress = play.mapProgress;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString = play.passed ? '' : ` (${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${absPos}. ${artist} - ${title} [${diffname}] by ${mapperName} (${mapStatus})
${lengthString} (${drainString})　${bpm} BPM　${sr}★　${modsPlusSign}${modsString}
AR: ${ar}${arAsterisk}　CS: ${cs}${csAsterisk}　OD: ${od}${odAsterisk}　HP: ${hp}${hpAsterisk}

Score: ${totalScore}　Combo: ${comboString}
Accuracy: ${acc}%
PP: ${ppEstimationMark}${pp}${ppForFcAndSsString}
Hitcounts: ${hitcountsString}
Grade: ${grade}${mapCompletionString}

Beatmap: ${mapUrlShort}
    `.trim();
  }

  async shortScoreDescription(play: OsuUserRecentPlay): Promise<string> {
    const map = play.beatmap;
    const mapset = play.beatmapset;

    let speed = 1;
    const dtMod = play.mods.find(m => m.acronym.isAnyOf('DT', 'NC'));
    if (dtMod !== undefined && dtMod.settings !== undefined) {
      speed =
        (dtMod.settings as SettingsDT).speedChange ??
        SettingsDefaults.DT.speedChange;
    }
    const htMod = play.mods.find(m => m.acronym.isAnyOf('HT', 'DC'));
    if (htMod !== undefined && htMod.settings !== undefined) {
      speed =
        (htMod.settings as SettingsHT).speedChange ??
        SettingsDefaults.HT.speedChange;
    }

    const absPos = `${play.absolutePosition}`;
    const {title} = mapset;
    const diffname = map.difficultyName;
    const sr = (await play.beatmap.estimatedStarRating)?.toFixed(2) ?? '—';
    const modAcronyms = play.mods.map(m => m.acronym);
    let modsString = modAcronyms.join('');
    const defaultSpeeds = [
      1,
      SettingsDefaults.DT.speedChange,
      SettingsDefaults.HT.speedChange,
    ];
    if (!defaultSpeeds.includes(speed)) {
      modsString += ` (${speed}x)`;
    }
    let modsPlusSign = '';
    if (modAcronyms.length) {
      modsPlusSign = '+';
    }
    const combo = play.combo;
    const max_combo = play.beatmap.maxCombo;
    const comboString = `${combo}x/${max_combo}x`;
    const acc = (play.accuracy * 100).toFixed(2);
    const ppValue = play.pp.value?.toFixed(2);
    const ppValueEstimation = (await play.pp.estimatedValue)?.toFixed(0);
    const pp = ppValue ?? ppValueEstimation ?? '—';
    const ppEstimationMark =
      ppValue === undefined && ppValueEstimation !== undefined ? '~' : '';
    const {grade} = play;
    const mapProgress = play.mapProgress;
    const completionPercent = (mapProgress * 100).toFixed(2);
    const mapCompletionString = play.passed ? '' : ` (${completionPercent}%)`;
    const mapUrlShort = map.url.replace('beatmaps', 'b');
    return `
${absPos}. ${title} [${diffname}] ${modsPlusSign}${modsString}
${sr}★　${grade}${mapCompletionString}　${comboString}　${acc}%
${ppEstimationMark}${pp}pp　 ${mapUrlShort}
    `.trim();
  }

  createUserNotFoundMessage(
    server: OsuServer,
    usernameInput: string
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
Пользователь с ником ${usernameInput} не найден
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
    });
  }

  createUsernameNotBoundMessage(
    server: OsuServer,
    setUsername:
      | ((username: string) => Promise<LinkUsernameResult | undefined>)
      | undefined,
    retryWithUsername: (
      username?: string
    ) => MaybeDeferred<UserRecentPlaysViewParams>
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const text = `
[Server: ${serverString}]
${setUsername === undefined ? 'У этого пользователя не' : 'Не'} установлен ник!
    `.trim();
    const generateLinkUsernamePage =
      setUsername === undefined
        ? undefined
        : () =>
            DynamicLinkUsernamePageGeneratorVk.createOutputMessage({
              server: server,
              getCancelPage: () =>
                this.createUsernameNotBoundMessage(
                  server,
                  setUsername,
                  retryWithUsername
                ),
              linkUsername: setUsername,
              successPageButton: {
                text: 'Повторить с новым ником',
                generateMessage: () =>
                  retryWithUsername().chain(
                    this.createOutputMessage.bind(this)
                  ),
              },
            });
    return MaybeDeferred.fromValue({
      navigation: {
        currentContent: {
          text: text,
        },
        navigationButtons: [
          [
            {
              text: 'Ввести ник для команды',
              generateMessage: () =>
                createRetryWithUsernameDynamicPage({
                  server: server,
                  getCancelPage: () =>
                    this.createUsernameNotBoundMessage(
                      server,
                      setUsername,
                      retryWithUsername
                    ),
                  retryWithUsername: retryWithUsername,
                  onSuccess: viewParams => this.createOutputMessage(viewParams),
                }),
            },
          ],
          ...(generateLinkUsernamePage === undefined
            ? []
            : [
                [
                  {
                    text: 'Привязать ник',
                    generateMessage: generateLinkUsernamePage,
                  },
                ],
              ]),
        ],
      },
    });
  }

  createNoRecentPlaysMessage(
    server: OsuServer,
    mode: OsuRuleset,
    passesOnly: boolean,
    username: string
  ): MaybeDeferred<VkOutputMessage> {
    const serverString = OsuServer[server];
    const modeString = OsuRuleset[mode];
    const text = `
[Server: ${serverString}, Mode: ${modeString}]
Нет последних ${passesOnly ? 'пассов' : 'скоров'}
    `.trim();
    return MaybeDeferred.fromValue({
      text: text,
      buttons: passesOnly
        ? [
            [
              {
                text: `Последний скор ${username}`,
                command: this.unparse({
                  passesOnly: false,
                  server: server,
                  username: username,
                  mode: mode,
                }),
              },
            ],
          ]
        : undefined,
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
  playInfo: OsuUserRecentPlay,
  coversRepository: VkBeatmapCoversRepository
): Promise<CoverAttachment> {
  const existingAttachment = await coversRepository.get({
    server: server,
    beatmapsetId: playInfo.beatmapset.id,
  });
  if (existingAttachment !== undefined) {
    return existingAttachment.attachment;
  }
  try {
    const newAttachment = await coversRepository.uploadAndSave(
      server,
      playInfo.beatmapset.id,
      playInfo.beatmapset.coverUrl
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

function createRetryWithUsernameDynamicPage({
  server,
  getCancelPage,
  retryWithUsername,
  onSuccess,
}: {
  server: OsuServer;
  getCancelPage: () => MaybeDeferred<VkOutputMessage>;
  retryWithUsername: (
    username?: string
  ) => MaybeDeferred<UserRecentPlaysViewParams>;
  onSuccess: (
    viewParams: UserRecentPlaysViewParams
  ) => MaybeDeferred<VkOutputMessage>;
}): MaybeDeferred<VkOutputMessage> {
  const serverString = OsuServer[server];
  return MaybeDeferred.fromValue<VkOutputMessage>({
    navigation: {
      currentContent: {
        text: 'Введите ник',
      },
      messageListener: {
        test: (replyText, senderInfo) => {
          if (!senderInfo.isDialogInitiator) {
            return undefined;
          }
          if (!USERNAME.match(replyText)) {
            return 'edit';
          }
          return 'match';
        },
        getEdit: replyText =>
          VK_REPLY_PROCESSING.sanitize(
            `«${replyText}» содержит недопустимые символы`
          ),
        generateMessage: (_, replyText) =>
          retryWithUsername(replyText).extend(result =>
            result.recentPlays === undefined
              ? {
                  navigation: {
                    currentContent: {
                      text: `[Server: ${serverString}]\nПользователь с ником ${replyText} не найден`,
                    },
                    navigationButtons: [
                      [
                        {
                          text: 'Ввести другой ник',
                          generateMessage: () =>
                            createRetryWithUsernameDynamicPage({
                              server,
                              getCancelPage,
                              retryWithUsername,
                              onSuccess,
                            }),
                        },
                      ],
                    ],
                  },
                }
              : onSuccess(result).resultValue
          ),
      },
      navigationButtons: [
        [
          {
            text: 'Отмена',
            generateMessage: getCancelPage,
          },
        ],
      ],
      enabledCaptions: [
        VkNavigationCaption.NAVIGATION_LISTENING,
        VkNavigationCaption.NAVIGATION_EXPIRE,
      ],
    },
  });
}

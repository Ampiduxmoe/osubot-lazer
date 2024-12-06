import {MaybeDeferred} from '../../../../primitives/MaybeDeferred';
import {DiffBrief} from '../../../commands/common/DiffBrief';
import {VkOutputMessage, VkOutputMessageContent} from '../../VkOutputMessage';

export class SwappableDiffMessageGenerator {
  constructor(
    private pageContents: VkOutputMessageContent[],
    private beatmapsetDiffs: DiffBrief[],
    private textForDiffsPage: string,
    private mapId: number,
    private generateMessageForMap: (
      mapId: number
    ) => MaybeDeferred<VkOutputMessage>
  ) {}

  generateDiffButtonText(diff: DiffBrief): string {
    return `(${diff.starRating}★) ${diff.diffName}`;
  }

  generateInitialMessage(): VkOutputMessage {
    return this.generateMessageForPage(0);
  }

  generateMessageForPage(pageIndex: number): VkOutputMessage {
    const {
      pageContents,
      beatmapsetDiffs,
      generateDifficultySelectMessage: generateMessageForAllDiffs,
      generateMessageForPage,
    } = this;
    const content = pageContents[pageIndex];
    const paginationButtons = (() => {
      if (pageContents.length === 1) {
        return [];
      }
      const result: {
        text: string;
        generateMessage: () => MaybeDeferred<VkOutputMessage>;
      }[] = [];
      if (pageIndex > 0) {
        result.push({
          text: '◀ Пред. стр.',
          generateMessage: () =>
            MaybeDeferred.fromValue(generateMessageForPage(pageIndex - 1)),
        });
      }
      if (pageIndex < pageContents.length - 1) {
        result.push({
          text: 'След. стр. ▶',
          generateMessage: () =>
            MaybeDeferred.fromValue(generateMessageForPage(pageIndex + 1)),
        });
      }
      return [result];
    })();
    const outputMessage: VkOutputMessage = {
      navigation: {
        currentContent: content,
        navigationButtons: [
          ...paginationButtons,
          ...(beatmapsetDiffs.length === 1
            ? []
            : [
                [
                  {
                    text: 'Выбрать другую диффу',
                    generateMessage: () =>
                      MaybeDeferred.fromValue(generateMessageForAllDiffs(0)),
                  },
                ],
              ]),
        ],
      },
    };
    return outputMessage;
  }

  generateDifficultySelectMessage(diffsPageIndex: number): VkOutputMessage {
    const {
      beatmapsetDiffs,
      textForDiffsPage,
      mapId,
      generateMessageForMap,
      generateDifficultySelectMessage,
      generateDiffButtonText,
    } = this;
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
      const buttonRow: {
        text: string;
        generateMessage: () => MaybeDeferred<VkOutputMessage>;
      }[] = [];
      if (diffsPageIndex > 0) {
        buttonRow.push({
          text: '◀ Предыдущие',
          generateMessage: () =>
            MaybeDeferred.fromValue(
              generateDifficultySelectMessage(diffsPageIndex - 1)
            ),
        });
      }
      if (diffsPageIndex < maxPageIndex) {
        buttonRow.push({
          text: 'Следующие ▶',
          generateMessage: () =>
            MaybeDeferred.fromValue(
              generateDifficultySelectMessage(diffsPageIndex + 1)
            ),
        });
      }
      return [buttonRow];
    })();
    const diffsToShow =
      maxPageIndex === 0
        ? beatmapsetDiffs
        : beatmapsetDiffs.slice(
            diffsPageIndex * maxDiffsOnPage,
            (diffsPageIndex + 1) * maxDiffsOnPage
          );
    const selectDiffsMessage: VkOutputMessage = {
      navigation: {
        currentContent: {
          text: textForDiffsPage,
        },
        navigationButtons: diffsToShow
          .map(diff => [
            {
              text: generateDiffButtonText(diff),
              generateMessage: () => generateMessageForMap(diff.id),
            },
          ])
          .concat([
            ...paginationButtons,
            [
              {
                text: 'Назад',
                generateMessage: () => generateMessageForMap(mapId),
              },
            ],
          ]),
      },
    };
    return selectDiffsMessage;
  }
}

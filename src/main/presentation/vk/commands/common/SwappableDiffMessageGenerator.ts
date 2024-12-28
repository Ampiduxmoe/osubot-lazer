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

  static create(args: {
    pageContents: VkOutputMessageContent[];
    beatmapsetDiffs: DiffBrief[];
    textForDiffsPage: string;
    mapId: number;
    generateMessageForMap: (mapId: number) => MaybeDeferred<VkOutputMessage>;
  }): SwappableDiffMessageGenerator {
    return new SwappableDiffMessageGenerator(
      args.pageContents,
      args.beatmapsetDiffs,
      args.textForDiffsPage,
      args.mapId,
      args.generateMessageForMap
    );
  }

  generateDiffButtonText(diff: DiffBrief): string {
    return `(${diff.starRating}★) ${diff.diffName}`;
  }

  generateInitialMessage(): VkOutputMessage {
    return this.generateMessageForPage(0);
  }

  generateMessageForPage(pageIndex: number): VkOutputMessage {
    const {pageContents, beatmapsetDiffs} = this;
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
            MaybeDeferred.fromValue(this.generateMessageForPage(pageIndex - 1)),
        });
      }
      if (pageIndex < pageContents.length - 1) {
        result.push({
          text: 'След. стр. ▶',
          generateMessage: () =>
            MaybeDeferred.fromValue(this.generateMessageForPage(pageIndex + 1)),
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
                      MaybeDeferred.fromValue(
                        this.generateDifficultySelectMessage(0)
                      ),
                  },
                ],
              ]),
        ],
      },
    };
    return outputMessage;
  }

  generateDifficultySelectMessage(diffsPageIndex: number): VkOutputMessage {
    const {beatmapsetDiffs, textForDiffsPage, mapId} = this;
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
              this.generateDifficultySelectMessage(diffsPageIndex - 1)
            ),
        });
      }
      if (diffsPageIndex < maxPageIndex) {
        buttonRow.push({
          text: 'Следующие ▶',
          generateMessage: () =>
            MaybeDeferred.fromValue(
              this.generateDifficultySelectMessage(diffsPageIndex + 1)
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
              text: this.generateDiffButtonText(diff),
              generateMessage: () => this.generateMessageForMap(diff.id),
            },
          ])
          .concat([
            ...paginationButtons,
            [
              {
                text: 'Назад',
                generateMessage: () => this.generateMessageForMap(mapId),
              },
            ],
          ]),
      },
    };
    return selectDiffsMessage;
  }
}

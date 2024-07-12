/* eslint-disable no-irregular-whitespace */
import {VkMessageContext} from '../VkMessageContext';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkOutputMessage} from './base/VkOutputMessage';
import {VkCommand} from './base/VkCommand';
import {APP_CODE_NAME} from '../../../App';
import {
  ANY_STRING,
  INTEGER_OR_RANGE,
  OWN_COMMAND_PREFIX,
  WORD,
} from '../../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../../common/arg_processing/MainArgsProcessor';
import {CommandPrefixes} from '../../common/CommandPrefixes';
import {TextProcessor} from '../../common/arg_processing/TextProcessor';
import {AnouncementsRepository} from '../../data/repositories/AnouncementsRepository';
import {PastAnouncementsRepository} from '../../data/repositories/PastAnouncementsRepository';
import {Anouncement} from '../../data/models/Anouncement';

export class Anouncements extends VkCommand<
  AnouncementsExecutionArgs,
  AnouncementsViewParams
> {
  internalName = Anouncements.name;
  shortDescription = 'управление объявлениями';
  longDescription =
    'Позволяет отобразить/добавить/протестировать объявления бота';
  notice = undefined;

  static prefixes = new CommandPrefixes('osubot-anouncements');
  prefixes = Anouncements.prefixes;

  private static COMMAND_PREFIX = OWN_COMMAND_PREFIX(this.prefixes);
  private COMMAND_PREFIX = Anouncements.COMMAND_PREFIX;
  private static WORD_SHOW = WORD('show');
  private WORD_SHOW = Anouncements.WORD_SHOW;
  private static WORD_CREATE = WORD('create');
  private WORD_CREATE = Anouncements.WORD_CREATE;
  private static WORD_EXECUTE = WORD('execute');
  private WORD_EXECUTE = Anouncements.WORD_EXECUTE;
  private static WORD_ECHO = WORD('echo');
  private WORD_ECHO = Anouncements.WORD_ECHO;
  private static ANOUNCEMENT_ID = INTEGER_OR_RANGE(
    'номер',
    'номер объявления или интервал в формате x-y',
    1,
    10
  );
  private ANOUNCEMENT_ID = Anouncements.ANOUNCEMENT_ID;
  private static ANOUNCEMENT_DESCRIPTION = ANY_STRING(
    'описание',
    'краткое описание объявления'
  );
  private ANOUNCEMENT_DESCRIPTION = Anouncements.ANOUNCEMENT_DESCRIPTION;
  private static ANOUNCEMENT_TEXT = ANY_STRING(
    'текст',
    'полный текст объявления'
  );
  private ANOUNCEMENT_TEXT = Anouncements.ANOUNCEMENT_TEXT;

  private static commandStructure = [
    {argument: this.COMMAND_PREFIX, isOptional: false}, // 0

    {argument: this.WORD_SHOW, isOptional: false}, // 1

    {argument: this.WORD_CREATE, isOptional: false}, // 2
    {argument: this.ANOUNCEMENT_DESCRIPTION, isOptional: false}, // 3
    {argument: this.ANOUNCEMENT_TEXT, isOptional: false}, // 4

    {argument: this.WORD_EXECUTE, isOptional: false}, // 5

    {argument: this.WORD_ECHO, isOptional: false}, // 6

    {argument: this.ANOUNCEMENT_ID, isOptional: false}, // 7
    {argument: this.ANOUNCEMENT_ID, isOptional: true}, // 8
  ];

  argGroups = {
    show: [0, 1, 8],
    create: [0, 2, 3, 4],
    execute: [0, 5, 7],
    echo: [0, 6, 7],
  };

  adminVkIds: number[];
  textProcessor: TextProcessor;
  anouncements: AnouncementsRepository;
  anouncementsHistory: PastAnouncementsRepository;
  sendToAllPeers: (text: string) => Promise<number[]>;
  constructor(
    adminVkIds: number[],
    textProcessor: TextProcessor,
    anouncements: AnouncementsRepository,
    anouncementsHistory: PastAnouncementsRepository,
    sendToAllPeers: (text: string) => Promise<number[]>
  ) {
    super(Anouncements.commandStructure);
    this.adminVkIds = adminVkIds;
    this.textProcessor = textProcessor;
    this.anouncements = anouncements;
    this.anouncementsHistory = anouncementsHistory;
    this.sendToAllPeers = sendToAllPeers;
  }

  matchVkMessage(
    ctx: VkMessageContext
  ): CommandMatchResult<AnouncementsExecutionArgs> {
    const fail = CommandMatchResult.fail<AnouncementsExecutionArgs>();
    if (!this.adminVkIds.includes(ctx.senderId)) {
      return fail;
    }
    let command: string | undefined = undefined;
    if (ctx.hasMessagePayload && ctx.messagePayload!.target === APP_CODE_NAME) {
      command = ctx.messagePayload!.command;
    } else if (ctx.hasText) {
      command = ctx.text!;
    }
    if (command === undefined) {
      return fail;
    }

    const tokens = this.textProcessor.tokenize(command);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    const ownPrefix = argsProcessor.use(this.COMMAND_PREFIX).at(0).extract();
    const executionArgs: AnouncementsExecutionArgs = {};

    if (argsProcessor.use(this.WORD_SHOW).at(0).extract() !== undefined) {
      const range = argsProcessor.use(this.ANOUNCEMENT_ID).at(0).extract();
      executionArgs.show = {
        idStart: range === undefined ? undefined : range[0],
        idEnd: range === undefined ? undefined : range[1],
      };
    } else if (
      argsProcessor.use(this.WORD_CREATE).at(0).extract() !== undefined
    ) {
      const anouncementDescription = argsProcessor
        .use(this.ANOUNCEMENT_DESCRIPTION)
        .at(0)
        .extract();
      const anouncementText = argsProcessor
        .use(this.ANOUNCEMENT_TEXT)
        .at(0)
        .extract();
      if (
        anouncementDescription === undefined ||
        anouncementText === undefined
      ) {
        return fail;
      }
      executionArgs.create = {
        description: anouncementDescription,
        text: anouncementText.trim(),
      };
    } else if (
      argsProcessor.use(this.WORD_EXECUTE).at(0).extract() !== undefined
    ) {
      const range = argsProcessor.use(this.ANOUNCEMENT_ID).at(0).extract();
      if (range === undefined) {
        return fail;
      }
      executionArgs.execute = {id: range[0]};
    } else if (
      argsProcessor.use(this.WORD_ECHO).at(0).extract() !== undefined
    ) {
      const range = argsProcessor.use(this.ANOUNCEMENT_ID).at(0).extract();
      if (range === undefined) {
        return fail;
      }
      executionArgs.echo = {id: range[0]};
    }

    if (argsProcessor.remainingTokens.length > 0) {
      return fail;
    }
    if (ownPrefix === undefined) {
      return fail;
    }
    if (
      (executionArgs.show ||
        executionArgs.create ||
        executionArgs.execute ||
        executionArgs.echo) === undefined
    ) {
      return fail;
    }
    return CommandMatchResult.ok(executionArgs);
  }

  async process(
    args: AnouncementsExecutionArgs
  ): Promise<AnouncementsViewParams> {
    if (args.show !== undefined) {
      const showArgs = args.show;
      const anouncements = await (async () => {
        if (showArgs.idStart === undefined || showArgs.idEnd === undefined) {
          return (await this.anouncements.getLastAnouncements(10)).reverse();
        }
        return (
          await this.anouncements.getManyByIdRange(
            showArgs.idStart,
            showArgs.idEnd
          )
        ).slice(0, 10);
      })();
      return {
        anouncements: anouncements.length === 0 ? null : anouncements,
      };
    }
    if (args.create !== undefined) {
      const newId = (
        await this.anouncements.addWithoutId({
          description: args.create.description,
          text: args.create.text,
          id: -1,
        })
      ).id;
      return {
        action: 'create',
        actionSuccess: true,
        createId: newId,
      };
    }
    if (args.execute !== undefined) {
      const anouncement = await this.anouncements.get({id: args.execute.id});
      if (anouncement === undefined) {
        return {
          action: 'execute',
          actionSuccess: false,
          executeChatCount: 0,
        };
      }
      const targets = await this.sendToAllPeers(anouncement.text);
      await this.anouncementsHistory.addWithoutId({
        anouncementId: args.execute.id,
        targets: 'vk: ' + targets.join(', '),
        time: Date.now(),
        id: -1,
      });
      return {
        action: 'execute',
        actionSuccess: true,
        executeChatCount: targets.length,
      };
    }
    if (args.echo !== undefined) {
      const anouncement = await this.anouncements.get({id: args.echo.id});
      if (anouncement === undefined) {
        return {
          action: 'execute',
          actionSuccess: false,
          executeChatCount: 0,
        };
      }
      return {
        echo: anouncement.text,
      };
    }
    throw Error('Unknown Anouncements command execution path');
  }

  createOutputMessage(params: AnouncementsViewParams): VkOutputMessage {
    const {
      anouncements,
      action,
      actionSuccess,
      createId,
      executeChatCount,
      echo,
    } = params;
    if (anouncements !== undefined) {
      if (anouncements === null) {
        return this.createNoAnouncementsMessage();
      }
      return this.createAnouncementsMessage(anouncements);
    }
    if (action !== undefined) {
      if (action === 'create') {
        return this.createAnouncementCreateResultMessage(
          actionSuccess!,
          createId
        );
      }
      if (action === 'execute') {
        return this.createAnouncementExecutionMessage(
          actionSuccess!,
          executeChatCount!
        );
      }
    }
    if (echo !== undefined) {
      return this.createAnouncementEchoMessage(echo);
    }
    throw Error('Unknown Anouncements command output path');
  }

  createAnouncementsMessage(anouncements: Anouncement[]): VkOutputMessage {
    const text = anouncements.map(x => `${x.id}. ${x.description}`).join('\n');
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createNoAnouncementsMessage(): VkOutputMessage {
    const text = 'Объявления отсутствуют!';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createAnouncementCreateResultMessage(
    actionSuccess: boolean,
    id: number | undefined
  ): VkOutputMessage {
    const text = actionSuccess
      ? `Объявление создано (id: ${id})`
      : 'Не удалось создать объявление';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createAnouncementExecutionMessage(
    actionSuccess: boolean,
    executeChatCount: number
  ): VkOutputMessage {
    const text = actionSuccess
      ? `Объявление отправлено (чатов: ${executeChatCount})`
      : 'Объявление не найдено';
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  createAnouncementEchoMessage(echo: string): VkOutputMessage {
    const text = echo;
    return {
      text: text,
      attachment: undefined,
      buttons: undefined,
    };
  }

  unparse(args: AnouncementsExecutionArgs): string {
    const tokens = [this.COMMAND_PREFIX.unparse(this.prefixes[0])];
    if (args.show !== undefined) {
      tokens.push(this.WORD_SHOW.unparse(''));
      if (args.show.idStart !== undefined && args.show.idEnd !== undefined) {
        tokens.push(
          this.ANOUNCEMENT_ID.unparse([args.show.idStart, args.show.idEnd])
        );
      }
    } else if (args.create !== undefined) {
      tokens.push(
        this.WORD_CREATE.unparse(''),
        this.ANOUNCEMENT_DESCRIPTION.unparse(args.create.description),
        this.ANOUNCEMENT_TEXT.unparse(args.create.text)
      );
    } else if (args.execute !== undefined) {
      tokens.push(
        this.WORD_EXECUTE.unparse(''),
        this.ANOUNCEMENT_ID.unparse([args.execute.id, args.execute.id])
      );
    } else if (args.echo !== undefined) {
      tokens.push(
        this.WORD_ECHO.unparse(''),
        this.ANOUNCEMENT_ID.unparse([args.echo.id, args.echo.id])
      );
    }
    return this.textProcessor.detokenize(tokens);
  }
}

type AnouncementsExecutionArgs = {
  show?: ShowArgs;
  create?: CreateArgs;
  execute?: ExecuteArgs;
  echo?: EchoArgs;
};

type ShowArgs = {
  idStart: number | undefined;
  idEnd: number | undefined;
};
type CreateArgs = {
  description: string;
  text: string;
};
type ExecuteArgs = {
  id: number;
};
type EchoArgs = {
  id: number;
};

type AnouncementsViewParams = {
  anouncements?: Anouncement[] | null;
  action?: 'create' | 'execute';
  actionSuccess?: boolean;
  createId?: number;
  executeChatCount?: number;
  echo?: string;
};

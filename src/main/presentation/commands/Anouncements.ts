import {MaybeDeferred} from '../../primitives/MaybeDeferred';
import {CommandMatchResult} from '../common/CommandMatchResult';
import {CommandPrefixes} from '../common/CommandPrefixes';
import {
  ANY_STRING,
  INTEGER,
  MULTIPLE_INTEGERS_OR_RANGES,
  OWN_COMMAND_PREFIX,
  WORD,
} from '../common/arg_processing/CommandArguments';
import {MainArgsProcessor} from '../common/arg_processing/MainArgsProcessor';
import {TextProcessor} from '../common/arg_processing/TextProcessor';
import {Anouncement} from '../data/models/Anouncement';
import {AnouncementsRepository} from '../data/repositories/AnouncementsRepository';
import {PastAnouncementsRepository} from '../data/repositories/PastAnouncementsRepository';
import {TextCommand} from './base/TextCommand';

export abstract class Anouncements<TContext, TOutput> extends TextCommand<
  AnouncementsExecutionArgs,
  AnouncementsViewParams,
  TContext,
  TOutput
> {
  internalName = Anouncements.name;
  shortDescription = 'управление объявлениями';
  longDescription =
    'Позволяет отобразить/добавить/протестировать объявления бота';
  notices = [];

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
  private static ANOUNCEMENT_ID = INTEGER(
    'номер',
    'номер объявления',
    'номер объявления или интервал в формате x-y',
    1,
    10
  );
  private ANOUNCEMENT_ID = Anouncements.ANOUNCEMENT_ID;
  private static ANOUNCEMENT_IDS = MULTIPLE_INTEGERS_OR_RANGES(
    'номер',
    'номер объявления',
    'номер объявления',
    1,
    10
  );
  private ANOUNCEMENT_IDS = Anouncements.ANOUNCEMENT_IDS;
  private static ANOUNCEMENT_DESCRIPTION = ANY_STRING(
    'описание',
    'описание объявления',
    'краткое описание объявления'
  );
  private ANOUNCEMENT_DESCRIPTION = Anouncements.ANOUNCEMENT_DESCRIPTION;
  private static ANOUNCEMENT_TEXT = ANY_STRING(
    'текст',
    'текст объявления',
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
    {argument: this.ANOUNCEMENT_IDS, isOptional: true}, // 8
  ];

  argGroups = {
    show: {
      isCompeting: true,
      description: 'Показывает созданные объявления',
      notices: [],
      memberIndices: [0, 1, 8],
    },
    create: {
      isCompeting: true,
      description: 'Создает объявление с заданными описанием и текстом',
      notices: [
        'Пробельные символы с конца и начала текста не попадают в финальный текст объявления',
      ],
      memberIndices: [0, 2, 3, 4],
    },
    execute: {
      isCompeting: true,
      description: 'Отправляет объявление во все чаты',
      notices: [],
      memberIndices: [0, 5, 7],
    },
    echo: {
      isCompeting: true,
      description: 'Отправляет в ответ текст выбранного объявления',
      notices: [],
      memberIndices: [0, 6, 7],
    },
  };

  constructor(
    public textProcessor: TextProcessor,
    protected anouncements: AnouncementsRepository,
    protected anouncementsHistory: PastAnouncementsRepository,
    protected sendToAllPeers: (text: string) => Promise<string[]>
  ) {
    super(Anouncements.commandStructure);
  }

  matchText(text: string): CommandMatchResult<AnouncementsExecutionArgs> {
    const fail = CommandMatchResult.fail<AnouncementsExecutionArgs>();
    const tokens = this.textProcessor.tokenize(text);
    const argsProcessor = new MainArgsProcessor(
      [...tokens],
      this.commandStructure.map(e => e.argument)
    );
    if (argsProcessor.use(this.COMMAND_PREFIX).at(0).extract() === undefined) {
      return fail;
    }
    const executionArgs: AnouncementsExecutionArgs = {};

    if (argsProcessor.use(this.WORD_SHOW).at(0).extract() !== undefined) {
      const range = argsProcessor.use(this.ANOUNCEMENT_IDS).at(0).extract();
      executionArgs.show =
        range?.map(([idStart, idEnd]) => ({idStart, idEnd})) ?? [];
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
      const id = argsProcessor.use(this.ANOUNCEMENT_ID).at(0).extract();
      if (id === undefined) {
        return fail;
      }
      executionArgs.execute = {id: id};
    } else if (
      argsProcessor.use(this.WORD_ECHO).at(0).extract() !== undefined
    ) {
      const id = argsProcessor.use(this.ANOUNCEMENT_ID).at(0).extract();
      if (id === undefined) {
        return fail;
      }
      executionArgs.echo = {id: id};
    }

    if (argsProcessor.remainingTokens.length > 0) {
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

  process(
    args: AnouncementsExecutionArgs
  ): MaybeDeferred<AnouncementsViewParams> {
    if (args.execute !== undefined) {
      const executeArgs = args.execute;
      const valuePromise: Promise<AnouncementsViewParams> = (async () => {
        const anouncement = await this.anouncements.get({id: executeArgs.id});
        if (anouncement === undefined) {
          return {
            action: 'execute',
            actionSuccess: false,
            executeChatCount: 0,
          };
        }
        const targets = await this.sendToAllPeers(anouncement.text);
        await this.anouncementsHistory.addWithoutId({
          anouncementId: executeArgs.id,
          targets: `${this.messageMediumPrefix}: ` + targets.join(','),
          time: Date.now(),
          id: -1,
        });
        return {
          action: 'execute',
          actionSuccess: true,
          executeChatCount: targets.length,
        };
      })();
      return MaybeDeferred.fromFastPromise(valuePromise);
    }
    const valuePromise: Promise<AnouncementsViewParams> = (async () => {
      if (args.show !== undefined) {
        const showArgs = args.show;
        const anouncements = await (async () => {
          if (showArgs.length === 0) {
            return (await this.anouncements.getLastAnouncements(10)).reverse();
          }
          return (
            await Promise.all(
              showArgs.map(range =>
                this.anouncements.getManyByIdRange(range.idStart, range.idEnd)
              )
            )
          )
            .flat()
            .slice(0, 10);
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
      throw Error(`Unknown ${this.internalName} command execution path`);
    })();
    return MaybeDeferred.fromInstantPromise(valuePromise);
  }

  abstract messageMediumPrefix: string;

  createOutputMessage(params: AnouncementsViewParams): MaybeDeferred<TOutput> {
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
    throw Error(`Unknown ${this.internalName} command output path`);
  }

  abstract createAnouncementsMessage(
    anouncements: Anouncement[]
  ): MaybeDeferred<TOutput>;
  abstract createNoAnouncementsMessage(): MaybeDeferred<TOutput>;
  abstract createAnouncementCreateResultMessage(
    actionSuccess: boolean,
    id: number | undefined
  ): MaybeDeferred<TOutput>;
  abstract createAnouncementExecutionMessage(
    actionSuccess: boolean,
    executeChatCount: number
  ): MaybeDeferred<TOutput>;
  abstract createAnouncementEchoMessage(echo: string): MaybeDeferred<TOutput>;

  unparse(args: AnouncementsExecutionArgs): string {
    const tokens = [this.COMMAND_PREFIX.unparse(this.prefixes[0])];
    if (args.show !== undefined) {
      tokens.push(this.WORD_SHOW.unparse(''));
      if (args.show.length > 0) {
        tokens.push(
          this.ANOUNCEMENT_IDS.unparse(
            args.show.map(({idStart, idEnd}) => [idStart, idEnd])
          )
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
        this.ANOUNCEMENT_ID.unparse(args.execute.id)
      );
    } else if (args.echo !== undefined) {
      tokens.push(
        this.WORD_ECHO.unparse(''),
        this.ANOUNCEMENT_ID.unparse(args.echo.id)
      );
    }
    return this.textProcessor.detokenize(tokens);
  }
}

export type AnouncementsExecutionArgs = {
  show?: ShowArgs;
  create?: CreateArgs;
  execute?: ExecuteArgs;
  echo?: EchoArgs;
};

type ShowArgs = {
  idStart: number;
  idEnd: number;
}[];
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

export type AnouncementsViewParams = {
  anouncements?: Anouncement[] | null;
  action?: 'create' | 'execute';
  actionSuccess?: boolean;
  createId?: number;
  executeChatCount?: number;
  echo?: string;
};

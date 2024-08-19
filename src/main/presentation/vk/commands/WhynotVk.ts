import {APP_CODE_NAME} from '../../../App';
import {maxBy} from '../../../primitives/Arrays';
import {MaybeDeferred} from '../../../primitives/MaybeDeferred';
import {TextCommand} from '../../commands/base/TextCommand';
import {Whynot, WhynotExecutionArgs} from '../../commands/Whynot';
import {CommandArgument} from '../../common/arg_processing/CommandArgument';
import {CommandMatchResult} from '../../common/CommandMatchResult';
import {VkMessageContext} from '../VkMessageContext';
import {VkOutputMessage} from '../VkOutputMessage';

export class WhynotVk extends Whynot<VkMessageContext, VkOutputMessage> {
  matchMessage(ctx: VkMessageContext): CommandMatchResult<WhynotExecutionArgs> {
    const fail = CommandMatchResult.fail<WhynotExecutionArgs>();
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
  createNoMatchMessage(): MaybeDeferred<VkOutputMessage> {
    return MaybeDeferred.fromValue({
      text: 'Ваш текст не соответствует ни одной команде',
      attachment: undefined,
      buttons: undefined,
    });
  }
  createPartialMatchMessage(
    inputText: string,
    preprocessedText: string,
    match: {
      matchResult: CommandMatchResult<unknown>;
      command: TextCommand<unknown, unknown, unknown, unknown>;
    }
  ): MaybeDeferred<VkOutputMessage> {
    const {matchResult, command} = match;
    const commandStructure = (() => {
      const tokenMapping = matchResult.partialMapping;
      if (tokenMapping === undefined) {
        return command.commandStructure;
      }
      const competingGroups = Object.keys(command.argGroups).reduce(
        (groups, key) => {
          if (!command.argGroups[key].isCompeting) {
            return {...groups, [key]: command.argGroups[key]};
          }
          return groups;
        },
        {}
      );
      const competingGroupKeys = Object.keys(competingGroups);
      if (competingGroupKeys.length === 0) {
        return command.commandStructure;
      }
      const bestStructureMatch = maxBy(
        groupCommandStructure => {
          const requiredArgs = groupCommandStructure
            .filter(e => !e.isOptional)
            .map(e => e.argument);
          const matchedArgs = Object.values(tokenMapping);
          let requiredArgMatchCount = 0;
          for (const arg of matchedArgs) {
            if (arg === undefined) {
              continue;
            }
            if (requiredArgs.includes(arg)) {
              requiredArgMatchCount += 1;
            }
          }
          return requiredArgMatchCount;
        },
        competingGroupKeys.map(key =>
          command.argGroups[key].memberIndices.map(
            i => command.commandStructure[i]
          )
        )
      );
      return bestStructureMatch;
    })();
    const missingRequiredArgs: CommandArgument<unknown>[] = (() => {
      const tokenMapping = matchResult.partialMapping;
      if (tokenMapping === undefined) {
        return [];
      }
      const matchedArgs = Object.values(tokenMapping);
      const requiredArgs = commandStructure
        .filter(e => !e.isOptional)
        .map(e => e.argument);
      return requiredArgs.filter(arg => !matchedArgs.includes(arg));
    })();
    const maxPrefixLength = Math.max(...command.prefixes.map(p => p.length));
    const longestCommandPrefix = command.prefixes.find(
      p => p.length === maxPrefixLength
    );
    const preprocessNotice =
      inputText === preprocessedText
        ? ''
        : `\n\nВаш текст: ${inputText}\nПреобразованный текст: ${preprocessedText}`;
    const argExplanationsStr = (() => {
      const tokenMapping = matchResult.partialMapping;
      if (tokenMapping === undefined) {
        return '';
      }
      return (
        '\n\nВаши аргументы:\n' +
        Object.entries(tokenMapping)
          .map(([token, arg]) => {
            if (arg !== undefined) {
              // eslint-disable-next-line no-irregular-whitespace
              return `　✅ ${token} — ${arg.description}`;
            }
            // eslint-disable-next-line no-irregular-whitespace
            return `　❌ ${token}`;
          })
          .join('\n')
      );
    })();
    const missingArgsStr =
      missingRequiredArgs.length === 0
        ? ''
        : '\n\nНе указаны обязательные аргументы:\n' +
          missingRequiredArgs
            .map(
              // eslint-disable-next-line no-irregular-whitespace
              arg => `　❌ ${arg.displayName} — ${arg.description}`
            )
            .join('\n');
    return MaybeDeferred.fromValue({
      text:
        'Частичное совпадение ' +
        `с командой ${longestCommandPrefix} (${command.shortDescription})` +
        `${preprocessNotice}${argExplanationsStr}${missingArgsStr}`,
      attachment: undefined,
      buttons: undefined,
    });
  }
  createFullMatchMessage(
    inputText: string,
    preprocessedText: string,
    match: {
      matchResult: CommandMatchResult<unknown>;
      command: TextCommand<unknown, unknown, unknown, unknown>;
    }
  ): MaybeDeferred<VkOutputMessage> {
    const {command} = match;
    const maxPrefixLength = Math.max(...command.prefixes.map(p => p.length));
    const longestCommandPrefix = command.prefixes.find(
      p => p.length === maxPrefixLength
    );
    const preprocessNotice =
      inputText === preprocessedText
        ? ''
        : `\n\nВаш текст: ${inputText}\nПреобразованный текст: ${preprocessedText}`;
    return MaybeDeferred.fromValue({
      text:
        'Ваш текст полностью соответствует ' +
        `команде ${longestCommandPrefix} (${command.shortDescription})` +
        `${preprocessNotice}`,
      attachment: undefined,
      buttons: undefined,
    });
  }
}

import {pickRandom, uniquesFilter} from '../../../primitives/Arrays';
import {ModAcronym} from '../../../primitives/ModAcronym';
import {ModCombinationPattern} from '../../../primitives/ModCombinationPattern';
import {ModPatternCollection} from '../../../primitives/ModPatternCollection';
import {
  ALL_OSU_PLAY_GRADE_KEYS,
  ALL_OSU_PLAY_GRADE_VALUES,
  OsuPlayGrade,
} from '../../../primitives/OsuPlayGrade';
import {
  ALL_OSU_RULESET_KEYS,
  ALL_OSU_RULESET_VALUES,
  OsuRuleset,
} from '../../../primitives/OsuRuleset';
import {OsuServer} from '../../../primitives/OsuServer';
import {CommandPrefixes} from '../CommandPrefixes';
import {SERVERS} from '../OsuServers';
import {CommandArgument} from './CommandArgument';

export const SERVER_PREFIX: CommandArgument<OsuServer> = {
  displayName: 'сервер',
  entityName: 'префикс сервера',
  description: 'буква или название сервера',
  get usageExample(): string {
    const prefix = pickRandom(SERVERS).prefix;
    return pickRandom([prefix, prefix.toLowerCase(), prefix.toUpperCase()]);
  },
  match: function (token: string): boolean {
    return SERVERS.getServerByPrefixIgnoringCase(token) !== undefined;
  },
  parse: function (token: string): OsuServer {
    return SERVERS.getServerByPrefixIgnoringCase(token)!;
  },
  unparse: function (value: OsuServer): string {
    return (
      SERVERS.find(x => x.server === value)?.prefix ??
      (() => {
        throw Error('Value should be a valid OsuServer');
      })()
    );
  },
};

export const OWN_COMMAND_PREFIX: (
  validPrefixes: CommandPrefixes
) => CommandArgument<string> = validPrefixes => ({
  displayName: validPrefixes.join('|'),
  entityName: 'префикс команды',
  description: undefined,
  get usageExample(): string {
    return pickRandom(validPrefixes);
  },
  match: function (token: string): boolean {
    return validPrefixes.matchIgnoringCase(token);
  },
  parse(token: string): string {
    return token;
  },
  unparse: function (value: string): string {
    return value;
  },
});

export const VK_FOREIGN_COMMAND_PREFIX: (
  validPrefixes: CommandPrefixes
) => CommandArgument<string> = validPrefixes => ({
  displayName: 'команда',
  entityName: 'префикс другой команды',
  description: 'буква или название команды',
  get usageExample(): string {
    return pickRandom(validPrefixes);
  },
  match: function (token: string): boolean {
    return validPrefixes.matchIgnoringCase(token);
  },
  parse: function (token: string): string {
    return token;
  },
  unparse: function (value: string): string {
    return value;
  },
});

export const USERNAME: CommandArgument<string> = {
  displayName: 'ник',
  entityName: 'ник игрока',
  description: 'ник игрока',
  get usageExample(): string {
    const someUsernames = [
      'mrekk',
      'Accolibed',
      'lifeline',
      'chud son',
      'gnahus',
      'ninerik',
      'Chicony',
      'Ivaxa',
      'Flaro',
      'aknzx',
    ];
    const username = pickRandom(someUsernames);
    return pickRandom([
      username.toLowerCase(),
      username.toUpperCase(),
      username,
      username,
    ]);
  },
  match: function (token: string): boolean {
    const invalidUsernameRegex = /[^a-zA-Z0-9_ [\-\]]/;
    return !invalidUsernameRegex.test(token);
  },
  parse: function (token: string): string {
    return token;
  },
  unparse: function (value: string): string {
    return value;
  },
};

type UsernameList = {
  usernames: string[];
  isAdditive: boolean;
};
export const USERNAME_LIST: CommandArgument<UsernameList> = {
  displayName: '~ники',
  entityName: 'список ников',
  description:
    'ники игроков, через запятую; используйте вариант ~~ники ' +
    'для того чтобы ники «добавились» к никам этого чата',
  get usageExample(): string {
    const someUsernames = [
      'mrekk',
      'Accolibed',
      'lifeline',
      'chud son',
      'gnahus',
      'ninerik',
      'Chicony',
      'Ivaxa',
      'Flaro',
      'aknzx',
    ];
    const username1 = pickRandom(someUsernames);
    const username2 = pickRandom(someUsernames.filter(x => x !== username1));
    return `~${username1},${username2}`;
  },
  match: function (token: string): boolean {
    return /^~~?[a-zA-Z0-9_ [\-\]]+?(,[a-zA-Z0-9_ [\-\]]+?)*?$/.test(token);
  },
  parse: function (token: string): UsernameList {
    const usernames = token
      .replace('~', '')
      .replace('~', '')
      .split(',')
      .map(x => x.trim());
    const isAdditive = token.startsWith('~~');
    return {
      usernames: usernames,
      isAdditive: isAdditive,
    };
  },
  unparse: function (value: UsernameList): string {
    return value.isAdditive ? '~~' : '~' + value.usernames.join(',');
  },
};

export const START_POSITION: CommandArgument<number> = {
  displayName: '\\номер',
  entityName: 'номер скора',
  description: 'номер скора, с которого начинать поиск',
  get usageExample(): string {
    const randPos = 1 + Math.floor(Math.random() * 9);
    return `\\${randPos}`;
  },
  match: function (token: string): boolean {
    if (!token.startsWith('\\')) {
      return false;
    }
    const parseResult = parseFloat(token.substring(1));
    if (isNaN(parseResult)) {
      return false;
    }
    return Number.isInteger(parseResult);
  },
  parse: function (token: string): number {
    return parseInt(token.substring(1));
  },
  unparse: function (value: number): string {
    return '\\' + value;
  },
};

export const QUANTITY: CommandArgument<number> = {
  displayName: ':количество',
  entityName: 'количество скоров',
  description: 'количество скоров',
  get usageExample(): string {
    const randPos = 1 + Math.floor(Math.random() * 9);
    return `:${randPos}`;
  },
  match: function (token: string): boolean {
    if (!token.startsWith(':')) {
      return false;
    }
    const parseResult = parseFloat(token.substring(1));
    if (isNaN(parseResult)) {
      return false;
    }
    return Number.isInteger(parseResult);
  },
  parse: function (token: string): number {
    return parseInt(token.substring(1));
  },
  unparse: function (value: number): string {
    return ':' + value;
  },
};

export const MODS: CommandArgument<ModAcronym[]> = {
  displayName: '+моды',
  entityName: 'список модов',
  description: 'список модов, слитно',
  get usageExample(): string {
    const maybeHd = pickRandom(['hd', 'HD', '']);
    const dtOrHr = pickRandom(['dt', 'DT', 'hr', 'HR']);
    const maybeCl = pickRandom(['cl', 'CL', '']);
    return pickRandom([
      `+${maybeHd}${dtOrHr}${maybeCl}`,
      `+${maybeCl}${maybeHd}${dtOrHr}`,
    ]);
  },
  match: function (token: string): boolean {
    const modsRegex = /^\+(?:[a-zA-Z]{2})+$/;
    return modsRegex.test(token);
  },
  parse: function (token: string): ModAcronym[] {
    const acronymsString = token.substring(1);
    return (
      acronymsString
        .match(/.{2}/g)
        ?.flat()
        ?.filter(uniquesFilter)
        ?.map(s => new ModAcronym(s)) ?? []
    );
  },
  unparse: function (value: ModAcronym[]): string {
    return '+' + value.join('');
  },
};

export type ModPatternsArg = {
  collection: ModPatternCollection;
  strictMatch: boolean;
};
export const MOD_PATTERNS: CommandArgument<ModPatternsArg> = {
  displayName: '+моды',
  entityName: 'список мод-фильтров',
  description:
    'список модов, слитно; допускается указание нескольких списков через запятую',
  get usageExample(): string {
    const maybeHd = pickRandom(['hd', 'HD', '(hd)', '(HD)', '']);
    const dtOrHr = pickRandom(['dt', 'DT', 'hr', 'HR']);
    const maybeCl = pickRandom(['cl', 'CL', '(cl)', '(CL)', '']);
    return pickRandom([
      `+${maybeHd}${dtOrHr}${maybeCl}`,
      `+${maybeCl}${maybeHd}${dtOrHr}`,
    ]);
  },
  match: function (token: string): boolean {
    const patternRegex =
      /^\^?(([a-zA-Z]{2})+|\(([a-zA-Z]{2})+?\)|\[([a-zA-Z]{2})+?\]|\{([a-zA-Z]{2})+?\})+$/;
    if (!token.startsWith('+') && !token.startsWith('^')) {
      return false;
    }
    const patternsString = (() => {
      if (token.endsWith('!')) {
        return token.substring(1, token.length - 1);
      }
      return token.substring(1);
    })();
    const potentialPatterns = patternsString.split(',');
    for (const potentialPattern of potentialPatterns) {
      if (!patternRegex.test(potentialPattern)) {
        return false;
      }
    }
    return true;
  },
  parse: function (token: string): ModPatternsArg {
    const patternsString = (() => {
      if (token.endsWith('!')) {
        return token.substring(1, token.length - 1);
      }
      return token.substring(1);
    })();
    const patternStrings = patternsString.split(',');
    const modPatterns = patternStrings.map(rawPatternString => {
      const [patternString, isInverted] = (() => {
        if (rawPatternString.startsWith('^')) {
          return [rawPatternString.substring(1), true];
        }
        return [rawPatternString, false];
      })();
      const optionalModGroups =
        patternString
          .match(/\((.{2})+?\)/g)
          ?.flat()
          ?.map(group =>
            group
              .substring(1, group.length - 1)
              .match(/.{2}/g)!
              .flat()
          ) ?? [];
      let remainingGroupsString = (() => {
        let tmpStr = patternString;
        for (const optionalModGroup of optionalModGroups) {
          tmpStr = tmpStr.replace(`(${optionalModGroup.join('')})`, '');
        }
        return tmpStr;
      })();
      const exclusiveModGroups =
        remainingGroupsString
          .match(/\[(.{2})+?\]/g)
          ?.flat()
          ?.map(group =>
            group
              .substring(1, group.length - 1)
              .match(/.{2}/g)!
              .flat()
          ) ?? [];
      for (const exclusiveModGroup of exclusiveModGroups) {
        remainingGroupsString = remainingGroupsString.replace(
          `[${exclusiveModGroup.join('')}]`,
          ''
        );
      }
      const prohibitedModGroups =
        remainingGroupsString
          .match(/\{(.{2})+?\}/g)
          ?.flat()
          ?.map(group =>
            group
              .substring(1, group.length - 1)
              .match(/.{2}/g)!
              .flat()
          ) ?? [];
      for (const prohibitedModGroup of prohibitedModGroups) {
        remainingGroupsString = remainingGroupsString.replace(
          `{${prohibitedModGroup.join('')}}`,
          ''
        );
      }
      const requiredModGroup =
        remainingGroupsString.match(/.{2}/g)?.flat() ?? [];
      const modPattern = new ModCombinationPattern(
        {
          mods: requiredModGroup.map(m => new ModAcronym(m)),
          type: 'required',
        },
        ...optionalModGroups.map(group => ({
          mods: group.map(m => new ModAcronym(m)),
          type: 'optional' as const,
        })),
        ...exclusiveModGroups.map(group => ({
          mods: group.map(m => new ModAcronym(m)),
          type: 'exclusive' as const,
        })),
        ...prohibitedModGroups.map(group => ({
          mods: group.map(m => new ModAcronym(m)),
          type: 'prohibited' as const,
        }))
      );
      modPattern.isInverted = isInverted;
      return modPattern;
    });
    const modPatternCollection = new ModPatternCollection(...modPatterns);
    if (token.startsWith('^')) {
      modPatternCollection.isInverted = true;
    }
    return {
      collection: modPatternCollection,
      strictMatch: token.endsWith('!'),
    };
  },
  unparse: function (value: ModPatternsArg): string {
    return (
      (value.collection.isInverted ? '^' : '+') +
      value.collection
        .map(
          pattern =>
            (pattern.isInverted ? '^' : '') +
            pattern
              .map(group => {
                const modsString = group.mods.join('');
                switch (group.type) {
                  case 'required':
                    return modsString;
                  case 'optional':
                    return `(${modsString})`;
                  case 'exclusive':
                    return `[${modsString}]`;
                  case 'prohibited':
                    return `{${modsString}}`;
                }
              })
              .join('')
        )
        .join(',') +
      (value.strictMatch ? '!' : '')
    );
  },
};

export const MODE: CommandArgument<OsuRuleset> = {
  displayName: '(режим)',
  entityName: 'режим игры',
  description:
    'режим игры; возможные значения: ' +
    ALL_OSU_RULESET_KEYS.map(x => `«${x}»`).join(', '),
  get usageExample(): string {
    return this.unparse(pickRandom(ALL_OSU_RULESET_VALUES));
  },
  match: function (token: string): boolean {
    const modeRegex = new RegExp(
      `^\\((${ALL_OSU_RULESET_KEYS.join('|')})\\)$`,
      'i'
    );
    const modeAbbreviations = ALL_OSU_RULESET_KEYS.map(mode => mode[0]);
    const uniqueAbbreviations = modeAbbreviations.filter(uniquesFilter);
    if (uniqueAbbreviations.length === modeAbbreviations.length) {
      const modeAbbreviationRegex = new RegExp(
        `^\\((${modeAbbreviations.join('|')})\\)$`,
        'i'
      );
      if (modeAbbreviationRegex.test(token)) {
        return true;
      }
    }
    return modeRegex.test(token);
  },
  parse: function (token: string): OsuRuleset {
    const modeName = token.toLowerCase().substring(1, token.length - 1);
    const rulesetKey = (() => {
      if (modeName.length === 1) {
        // find by first letter
        return ALL_OSU_RULESET_KEYS.find(
          x => x.toLocaleLowerCase()[0] === modeName
        );
      }
      return ALL_OSU_RULESET_KEYS.find(x => x.toLowerCase() === modeName);
    })();
    if (rulesetKey === undefined) {
      throw Error('Token should be a valid OsuRuleset key');
    }
    return OsuRuleset[rulesetKey];
  },
  unparse: function (value: OsuRuleset): string {
    return `(${OsuRuleset[value]})`;
  },
};

export const SCORE_COMBO: CommandArgument<number> = {
  displayName: '?x',
  entityName: 'комбо',
  description: 'комбо',
  get usageExample(): string {
    return pickRandom([100, 250, 375, 500, 727]) + 'x';
  },
  match: function (token: string): boolean {
    return /^\d+?x$/i.test(token);
  },
  parse: function (token: string): number {
    return parseInt(token.toLowerCase().replace('x', ''));
  },
  unparse: function (value: number): string {
    return value + 'x';
  },
};

export const MISSCOUNT: CommandArgument<number> = {
  displayName: '?xm',
  entityName: 'количество миссов',
  description: 'количество миссов',
  get usageExample(): string {
    return pickRandom([1, 2, 5, 10, 25]) + 'xm';
  },
  match: function (token: string): boolean {
    return /^\d+?xm$/i.test(token);
  },
  parse: function (token: string): number {
    return parseInt(token.toLowerCase().replace('xm', ''));
  },
  unparse: function (value: number): string {
    return value + 'xm';
  },
};

export const SMALLMISSCOUNT: CommandArgument<number> = {
  displayName: '?xdm',
  entityName: 'количество дроплет-миссов',
  description: 'количество дроплет-миссов',
  get usageExample(): string {
    return pickRandom([1, 2, 5, 10, 25]) + 'xdm';
  },
  match: function (token: string): boolean {
    return /^\d+?xdm$/i.test(token);
  },
  parse: function (token: string): number {
    return parseInt(token.toLowerCase().replace('xdm', ''));
  },
  unparse: function (value: number): string {
    return value + 'xdm';
  },
};

export const ACCURACY: CommandArgument<number> = {
  displayName: '?%',
  entityName: 'точность',
  description: 'точность',
  get usageExample(): string {
    return pickRandom([72.7, 92, 95.67, 98.5, 99.71]) + '%';
  },
  match: function (token: string): boolean {
    return /^\d+?(\.\d+?)?%$/i.test(token);
  },
  parse: function (token: string): number {
    return parseFloat(token.replace('%', ''));
  },
  unparse: function (value: number): string {
    return value + '%';
  },
};

export const FIFTYCOUNT: CommandArgument<number> = {
  displayName: '?x50',
  entityName: 'количество 50',
  description: 'количество 50',
  get usageExample(): string {
    return pickRandom([2, 4, 8, 16, 32]) + 'x50';
  },
  match: function (token: string): boolean {
    return /^\d+?x50$/i.test(token);
  },
  parse: function (token: string): number {
    return parseInt(token.toLowerCase().replace('x50', ''));
  },
  unparse: function (value: number): string {
    return value + 'x50';
  },
};

export const HUNDREDCOUNT: CommandArgument<number> = {
  displayName: '?x100',
  entityName: 'количество 100',
  description: 'количество 100',
  get usageExample(): string {
    return pickRandom([1, 2, 3, 5, 8, 13, 21, 34]) + 'x100';
  },
  match: function (token: string): boolean {
    return /^\d+?x100$/i.test(token);
  },
  parse: function (token: string): number {
    return parseInt(token.toLowerCase().replace('x100', ''));
  },
  unparse: function (value: number): string {
    return value + 'x100';
  },
};

export const HUNDREDFIFTYCOUNT: CommandArgument<number> = {
  displayName: '?x150',
  entityName: 'количество 150',
  description: 'количество 150',
  get usageExample(): string {
    return pickRandom([1, 2, 3, 5, 8, 13, 21, 34]) + 'x150';
  },
  match: function (token: string): boolean {
    return /^\d+?x150$/i.test(token);
  },
  parse: function (token: string): number {
    return parseInt(token.toLowerCase().replace('x150', ''));
  },
  unparse: function (value: number): string {
    return value + 'x150';
  },
};

export const SPEED_RATE: CommandArgument<number> = {
  displayName: '?.?x',
  entityName: 'множитель HT/DT',
  description: 'скорость карты для модов HT/DC/DT/NC',
  get usageExample(): string {
    return pickRandom([1.01, 1.25, 1.67, 2, 0.99, 0.75, 0.67, 0.5]) + 'x';
  },
  match: function (token: string): boolean {
    return /^\d\.\d+x$/i.test(token);
  },
  parse: function (token: string): number {
    return parseFloat(token.toLowerCase().replace('x', ''));
  },
  unparse: function (value: number): string {
    return value + 'x';
  },
};

export type ArgDA = {
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
};

export const DIFFICULTY_ADJUST_SETTING: (
  ...keys: (keyof ArgDA)[]
) => CommandArgument<ArgDA> = (...keys) => ({
  displayName: keys.map(k => `${k}?`).join('|'),
  entityName: 'настройки для DA мода',
  description: 'настройки для DA мода',
  get usageExample(): string {
    return pickRandom(keys) + pickRandom([6.7, 8, 9.5, 10]);
  },
  match: function (token: string): boolean {
    const allEntries = token.split(' ');
    const regex = new RegExp(`^(?:${keys.join('|')})\\d+(?:\\.\\d)?$`, 'i');
    for (const entry of allEntries) {
      if (!regex.test(entry)) {
        return false;
      }
    }
    return true;
  },
  parse: function (token: string): ArgDA {
    const stats = token.split(' ').map(x => ({
      key: x.toLowerCase().substring(0, 2) as keyof ArgDA,
      valueStr: x.substring(2),
    }));
    const output = {} as ArgDA;
    for (const stat of stats) {
      output[stat.key] = parseFloat(stat.valueStr);
    }
    return output;
  },
  unparse: function (value: ArgDA): string {
    return keys
      .filter(key => value[key] !== undefined)
      .map(key => key + value[key])
      .join(' ');
  },
});

export const WORD: (
  word: string,
  entityName?: string,
  description?: string
) => CommandArgument<string> = (word, entityName, description) => ({
  displayName: word,
  entityName: entityName ?? `слово «${word}»`,
  description: description ?? `слово «${word}»`,
  get usageExample(): string {
    return pickRandom([word.toLowerCase(), word.toUpperCase()]);
  },
  match: function (token: string): boolean {
    return token.toLowerCase() === word.toLowerCase();
  },
  parse: function (token: string): string {
    return token;
  },
  unparse: function (): string {
    return word;
  },
});

export const ANY_WORD: (
  name: string,
  entityName: string,
  description: string
) => CommandArgument<string> = (name, entityName, description) => ({
  displayName: name,
  entityName: entityName,
  description: description,
  get usageExample(): string {
    return pickRandom(['любоеслово', 'другоеслово']);
  },
  match: function (token: string): boolean {
    return /^\w+$/.test(token);
  },
  parse: function (token: string): string {
    return token;
  },
  unparse: function (value: string): string {
    return value;
  },
});

export const ANY_STRING: (
  name: string,
  entityName: string,
  description: string,
  getUsageExample?: (this: CommandArgument<string>) => string
) => CommandArgument<string> = (
  name,
  entityName,
  description,
  getUsageExample
) => ({
  displayName: name,
  entityName: entityName,
  description: description,
  get usageExample(): string {
    const providedExample = getUsageExample?.call(this);
    return providedExample ?? pickRandom(['любаястрока', 'другаястрока']);
  },
  match: function (): boolean {
    return true;
  },
  parse: function (token: string): string {
    return token;
  },
  unparse: function (value: string): string {
    return value;
  },
});

export const DAY_OFFSET: CommandArgument<number> = {
  displayName: 'today{±?}',
  entityName: 'номер дня относительно сегодня',
  description: 'номер дня относительно сегодня',
  get usageExample(): string {
    const randInt = Math.floor(Math.random() * 5);
    const sign = pickRandom(['+', '-']);
    const pos = `{${sign}${randInt}}`;
    const maybePos = pickRandom(['', pos, pos]);
    return `today${maybePos}`;
  },
  match: function (token: string): boolean {
    return /^today({[+-]\d+})?$/i.test(token);
  },
  parse: function (token: string): number {
    return (
      parseInt(token.toLowerCase().replace('today{', '').replace('}', '')) || 0
    );
  },
  unparse: function (value: number): string {
    if (value === 0) {
      return 'today';
    }
    return `today{${value > 0 ? '+' : ''}${value}}`;
  },
};

export const DATE: CommandArgument<Date> = {
  displayName: 'дата|' + DAY_OFFSET.displayName,
  entityName: 'дата или смещение относительно сегодня',
  description: 'дата в формате ISO8601 или номер дня относительно сегодня',
  get usageExample(): string {
    const date = new Date().toISOString().substring(0, 10);
    return pickRandom([date, DAY_OFFSET.usageExample]);
  },
  match: function (token: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(token) || DAY_OFFSET.match(token);
  },
  parse: function (token: string): Date {
    if (DAY_OFFSET.match(token)) {
      const offset = DAY_OFFSET.parse(token);
      const result = new Date();
      result.setUTCHours(0, 0, 0, 0);
      result.setUTCDate(result.getUTCDate() + offset);
      return result;
    }
    return new Date(Date.parse(token));
  },
  unparse: function (value: Date): string {
    return value.toISOString().substring(0, 10);
  },
};

export const INTEGER: (
  displayName: string,
  description: string,
  entityName: string,
  min: number | undefined,
  max: number | undefined
) => CommandArgument<number> = (
  displayName,
  entityName,
  description,
  min,
  max
) => ({
  displayName: displayName,
  entityName: entityName,
  description: description,
  get usageExample(): string {
    const exampleMin = min ?? -999999;
    const exampleMax = max ?? 999999;
    const range = exampleMax - exampleMin;
    const randPos = exampleMin + Math.floor(Math.random() * (range + 1));
    return `${randPos}`;
  },
  match: function (token: string): boolean {
    const intRegex = /^-?\d+?$/;
    if (!intRegex.test(token)) {
      return false;
    }
    const number = parseInt(token);
    if (min !== undefined && number < min) {
      return false;
    }
    if (max !== undefined && number > max) {
      return false;
    }
    return true;
  },
  parse: function (token: string): number {
    return parseInt(token);
  },
  unparse: function (value: number): string {
    return value.toString();
  },
});

export const INTEGER_RANGE: (
  displayName: string,
  entityName: string,
  description: string,
  min: number | undefined,
  max: number | undefined
) => CommandArgument<[number, number]> = (
  displayName,
  entityName,
  description,
  min,
  max
) => ({
  displayName: displayName,
  entityName: entityName,
  description: description,
  get usageExample(): string {
    const exampleMin = min ?? -999999;
    const exampleMax = max ?? 999999;
    const range = exampleMax - exampleMin;
    const randPos1 = exampleMin + Math.floor(Math.random() * (range + 1));
    const randPos2 = exampleMin + Math.floor(Math.random() * (range + 1));
    return this.unparse([
      Math.min(randPos1, randPos2),
      Math.max(randPos1, randPos2),
    ]);
  },
  match: function (token: string): boolean {
    const rangeRegex =
      /^(?<number1>\d+?|\(-\d+?\))-(?<number2>\d+?|\(-\d+?\))$/;
    const groups = rangeRegex.exec(token)?.groups;
    if (groups === null) {
      return false;
    }
    const a = parseInt(groups!['number1']);
    const b = parseInt(groups!['number2']);
    if (isNaN(a) || isNaN(b)) {
      return false;
    }
    if (a > b) {
      return false;
    }
    if (min !== undefined && a < min) {
      return false;
    }
    if (max !== undefined && b > max) {
      return false;
    }
    return true;
  },
  parse: function (token: string): [number, number] {
    const rangeRegex =
      /^(?<number1>\d+?|\(-\d+?\))-(?<number2>\d+?|\(-\d+?\))$/;
    const groups = rangeRegex.exec(token)!.groups!;
    const a = parseInt(groups['number1']);
    const b = parseInt(groups['number2']);
    return [a, b];
  },
  unparse: function (value: [number, number]): string {
    const left = value[0] < 0 ? `(${value[0]})` : value[0];
    const right = value[1] < 0 ? `(${value[1]})` : value[1];
    return left + '-' + right;
  },
});

export const INTEGER_OR_RANGE: (
  displayName: string,
  entityName: string,
  description: string,
  min: number | undefined,
  max: number | undefined
) => CommandArgument<[number, number]> = (
  displayName,
  entityName,
  description,
  min,
  max
) => {
  const integerArg = INTEGER('', '', '', min, max);
  const rangeArg = INTEGER_RANGE('', '', '', min, max);
  return {
    displayName: displayName,
    entityName: entityName,
    description: description,
    get usageExample(): string {
      return pickRandom([
        () => integerArg.usageExample,
        () => rangeArg.usageExample,
      ])();
    },
    match: function (token: string): boolean {
      return integerArg.match(token) || rangeArg.match(token);
    },
    parse: function (token: string): [number, number] {
      if (integerArg.match(token)) {
        const number = integerArg.parse(token);
        return [number, number];
      }
      return rangeArg.parse(token);
    },
    unparse: function (value: [number, number]): string {
      if (value[0] === value[1]) {
        return integerArg.unparse(value[0]);
      }
      return rangeArg.unparse(value);
    },
  };
};

export const MULTIPLE_INTEGERS_OR_RANGES: (
  displayName: string,
  entityName: string,
  description: string,
  min: number | undefined,
  max: number | undefined
) => CommandArgument<[number, number][]> = (
  displayName,
  entityName,
  description,
  min,
  max
) => {
  const integerOrRangeArg = INTEGER_OR_RANGE('', '', '', min, max);
  return {
    displayName: displayName,
    entityName: entityName,
    description: description,
    get usageExample(): string {
      return new Array(pickRandom([1, 2, 3]))
        .map(() => integerOrRangeArg.usageExample)
        .join(',');
    },
    match: function (token: string): boolean {
      for (const integerOrRange of token.split(',').map(x => x.trim())) {
        if (!integerOrRangeArg.match(integerOrRange)) {
          return false;
        }
      }
      return true;
    },
    parse: function (token: string): [number, number][] {
      return token.split(',').map(x => integerOrRangeArg.parse(x.trim()));
    },
    unparse: function (value: [number, number][]): string {
      return value
        .map(integerOrRange => integerOrRangeArg.unparse(integerOrRange))
        .join(',');
    },
  };
};

export const APP_USER_ID = ANY_STRING(
  'ид_польз_прил',
  'ID пользователя приложения',
  'ID пользователя приложения'
);
export const MESSAGE_ID = ANY_STRING(
  'ид_сообщения',
  'ID сообщения',
  'ID сообщения'
);
export const CUSTOM_PAYLOAD: CommandArgument<string> = {
  displayName: 'payload=?',
  entityName: 'дополнительные данные',
  description: 'дополнительные данные',
  get usageExample(): string {
    return pickRandom(['любаястрока', 'другаястрока']);
  },
  match: function (token: string): boolean {
    return token.startsWith('payload=');
  },
  parse: function (token: string): string {
    return token.substring('payload='.length);
  },
  unparse: function (value: string): string {
    return `payload=${value}`;
  },
};

export const VK_USER_ID = INTEGER(
  'ид_вк',
  'ID пользователя VK',
  'ID пользователя VK',
  0,
  99999999
);

type BeatmapLinkArg = {server: OsuServer; id: number};

export const BEATMAP_LINK: CommandArgument<BeatmapLinkArg> = (() => {
  const integerArg = INTEGER('', '', '', 0, 1e9);
  const beatmapLinkRegexes: Record<keyof typeof OsuServer, RegExp[]> = {
    Bancho: [
      /^(https?:\/\/)?osu\.ppy\.sh\/b\/(?<ID>\d+)\/?$/i,
      /^(https?:\/\/)?osu\.ppy\.sh\/beatmaps\/(?<ID>\d+)\/?$/i,
      /^(https?:\/\/)?osu\.ppy\.sh\/beatmapsets\/(\d+)#(osu|taiko|fruits|mania)+\/(?<ID>\d+)\/?$/i,
    ],
  };
  return {
    displayName: 'ссылка_на_карту',
    entityName: 'ссылка на карту',
    description: 'ссылка на карту (не мапсет!)',
    get usageExample(): string {
      const mapIdStr = integerArg.usageExample;
      const randomBeatmapsetIdStr = integerArg.usageExample;
      const randomMode = pickRandom(['osu', 'taiko', 'fruits', 'mania']);
      return pickRandom([
        'osu.ppy.sh/b/' + mapIdStr,
        'http://osu.ppy.sh/beatmaps/' + mapIdStr,
        `https://osu.ppy.sh/beatmapsets/${randomBeatmapsetIdStr}#${randomMode}/${mapIdStr}/`,
      ]);
    },
    match: function (token: string): boolean {
      for (const server in beatmapLinkRegexes) {
        const serverAsKey = server as keyof typeof OsuServer;
        const serverRegexes = beatmapLinkRegexes[serverAsKey];
        for (const regex of serverRegexes) {
          if (regex.test(token)) {
            return true;
          }
        }
      }
      return false;
    },
    parse: function (token: string): BeatmapLinkArg {
      for (const server in beatmapLinkRegexes) {
        const serverAsKey = server as keyof typeof OsuServer;
        const serverRegexes = beatmapLinkRegexes[serverAsKey];
        for (const regex of serverRegexes) {
          const matches = regex.exec(token);
          const idString = matches?.groups?.ID;
          if (idString !== undefined) {
            return {
              server: OsuServer[serverAsKey],
              id: parseInt(idString),
            };
          }
        }
      }
      throw Error('Parse should only be called for matching tokens');
    },
    unparse: function (value: BeatmapLinkArg): string {
      switch (value.server) {
        case OsuServer.Bancho:
          return 'https://osu.ppy.sh/b/' + value.id;
      }
    },
  };
})();

export const BEATMAP_ID: CommandArgument<number> = (() => {
  const integerArg = INTEGER('', '', '', 0, 1e9);
  const beatmapLinkArg = BEATMAP_LINK;
  return {
    displayName: '#ид_карты|ссылка',
    entityName: 'ид карты или ссылка',
    description: 'ID карты или ссылка на карту (не мапсет!)',
    get usageExample(): string {
      const mapIdStr = integerArg.usageExample;
      return pickRandom(['#' + mapIdStr, beatmapLinkArg.usageExample]);
    },
    match: function (token: string): boolean {
      if (token.startsWith('#')) {
        return integerArg.match(token.substring(1));
      }
      return beatmapLinkArg.match(token);
    },
    parse: function (token: string): number {
      if (token.startsWith('#')) {
        return integerArg.parse(token.substring(1));
      }
      return beatmapLinkArg.parse(token).id;
    },
    unparse: function (value: number): string {
      return '#' + value;
    },
  };
})();

export const ALIAS_PATTERN: CommandArgument<string> = {
  displayName: 'свой_паттерн',
  entityName: 'паттерн для алиаса',
  description:
    'ваша строка (до 40 символов), которая будет заменяться на команду бота; ' +
    'по умолчанию замена работает только при полном совпадении сообщения со строкой, ' +
    'но если ваш паттерн заканчивается символом «*», ' +
    'то заменяться будет только совпадение до «звездочки»',
  get usageExample(): string {
    return pickRandom(['моякоманда*', 'смотри', 'x*', '???']);
  },
  match: function (token: string): boolean {
    return token.length <= 40;
  },
  parse: function (token: string): string {
    return token;
  },
  unparse: function (value: string): string {
    return value;
  },
};

export const ALIAS_TARGET: CommandArgument<string> = {
  displayName: 'команда_бота',
  entityName: 'замена для паттерна',
  description: 'строка (до 40 символов), которая будет заменять ваш шаблон',
  get usageExample(): string {
    return pickRandom(['l r', 'l personalbest', 'l u', 'osubot-help']);
  },
  match: function (token: string): boolean {
    return token.length <= 40;
  },
  parse: function (token: string): string {
    return token;
  },
  unparse: function (value: string): string {
    return value;
  },
};

export type VkMentionArg = {
  type: 'group' | 'user';
  id: number;
  text: string;
};
export const VK_MENTION: CommandArgument<VkMentionArg> = {
  displayName: 'упоминание',
  entityName: 'упоминание человека/группы',
  description: 'упоминание (тег/саммон) кого-либо',
  get usageExample(): string {
    return pickRandom(['l r', 'l personalbest', 'l u', 'osubot-help']);
  },
  match: function (token: string): boolean {
    return /^\[(?:club|id)\d+\|.+?\]$/.test(token);
  },
  parse: function (token: string): VkMentionArg {
    const match = /^\[(club|id)(\d+)\|(.+?)\]$/.exec(token);
    if (match === null) {
      throw Error('Parse should only be called for matching tokens');
    }
    return {
      type:
        {
          club: 'group' as const,
          id: 'user' as const,
        }[match[1]] ??
        (() => {
          throw Error('Unkown mention type');
        })(),
      id: parseInt(match[2]),
      text: match[3],
    };
  },
  unparse: function (value: VkMentionArg): string {
    const prefix = {
      group: 'club',
      user: 'id',
    }[value.type];
    return `[${prefix}${value.id}|${value.text}]`;
  },
};

export const GRADE_RANGE: CommandArgument<[OsuPlayGrade, OsuPlayGrade]> = {
  displayName: 'rank=?',
  entityName: 'ранг плея',
  description: `ранг сыгранного скора (${ALL_OSU_PLAY_GRADE_KEYS.join('/')})`,
  get usageExample(): string {
    const randPos1 = pickRandom(ALL_OSU_PLAY_GRADE_VALUES);
    const randPos2 = pickRandom(ALL_OSU_PLAY_GRADE_VALUES);
    return this.unparse([
      Math.min(randPos1, randPos2),
      Math.max(randPos1, randPos2),
    ]);
  },
  match: function (token: string): boolean {
    const allGrades = ALL_OSU_PLAY_GRADE_KEYS.join('|');
    const allSigns = ['<', '>', '='].join('|');
    const singleGradeRegex = new RegExp(
      `^rank(?<sign>${allSigns})(?<grade>${allGrades})$`,
      'i'
    );
    const gradeRangeRegex = new RegExp(
      `^rank=(?<grade1>${allGrades})-(?<grade2>${allGrades})$`,
      'i'
    );
    return singleGradeRegex.test(token) || gradeRangeRegex.test(token);
  },
  parse: function (token: string): [number, number] {
    const allGrades = ALL_OSU_PLAY_GRADE_KEYS.join('|');
    const allSigns = ['<', '>', '='].join('|');
    const singleGradeRegex = new RegExp(
      `^rank(?<sign>${allSigns})(?<grade>${allGrades})$`,
      'i'
    );
    if (singleGradeRegex.test(token)) {
      const sign = token['rank'.length];
      const grade =
        OsuPlayGrade[
          token
            .substring('rank='.length)
            .toUpperCase() as keyof typeof OsuPlayGrade
        ];
      if (sign === '=') {
        return [grade, grade];
      }
      if (sign === '<') {
        return [Math.min(...ALL_OSU_PLAY_GRADE_VALUES), grade - 1];
      }
      if (sign === '>') {
        return [grade + 1, Math.max(...ALL_OSU_PLAY_GRADE_VALUES)];
      }
    }
    const gradeRangeRegex = new RegExp(
      `^rank=(?<grade1>${allGrades})-(?<grade2>${allGrades})$`,
      'i'
    );
    const groups = gradeRangeRegex.exec(token)?.groups;
    const a =
      OsuPlayGrade[
        groups!['grade1'].toUpperCase() as keyof typeof OsuPlayGrade
      ];
    const b =
      OsuPlayGrade[
        groups!['grade2'].toUpperCase() as keyof typeof OsuPlayGrade
      ];
    return [Math.min(a, b), Math.max(a, b)];
  },
  unparse: function (value: [OsuPlayGrade, OsuPlayGrade]): string {
    if (value[0] > 0 && value[1] === Math.max(...ALL_OSU_PLAY_GRADE_VALUES)) {
      return `rank>${OsuPlayGrade[value[0] - 1]}`;
    }
    if (value[0] === 0 && value[1] < Math.max(...ALL_OSU_PLAY_GRADE_VALUES)) {
      return `rank<${OsuPlayGrade[value[1] + 1]}`;
    }
    if (value[0] === value[1]) {
      const v = value[0];
      const signs = ['='];
      if (v > 0) {
        signs.push('<');
      }
      if (v < Math.max(...ALL_OSU_PLAY_GRADE_VALUES)) {
        signs.push('>');
      }
      const sign = pickRandom(signs);
      return `rank${sign}${OsuPlayGrade[0]}`;
    }
    return 'rank=' + OsuPlayGrade[value[0]] + '-' + OsuPlayGrade[value[1]];
  },
};

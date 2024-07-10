import {OsuServer} from '../../../../primitives/OsuServer';
import {SERVERS} from '../OsuServers';
import {pickRandom, uniquesFilter} from '../../../../primitives/Arrays';
import {CommandArgument} from './CommandArgument';
import {ModArg} from './ModArg';
import {CommandPrefixes} from '../CommandPrefixes';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../../primitives/OsuRuleset';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export const SERVER_PREFIX: CommandArgument<OsuServer> = {
  displayName: 'сервер',
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

export const MODS: CommandArgument<ModArg[]> = {
  displayName: '+моды',
  description:
    'список модов, слитно; если мод указан в скобках, то его наличие допускается, но не является необходимым',
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
    const modsRegex = /^\+(([a-zA-Z]{2})|(\([a-zA-Z]{2}\)))+$/;
    return modsRegex.test(token);
  },
  parse: function (token: string): ModArg[] {
    const acronymsString = token.substring(1);
    const optionalModAcronyms =
      acronymsString
        .match(/\(.{2}\)/g)
        ?.flat()
        ?.filter(uniquesFilter)
        ?.map(s => s.substring(1, 3)) ?? [];
    const requiredModsAcronymsString = (() => {
      let tmpStr = acronymsString;
      for (const optionalMod of optionalModAcronyms) {
        tmpStr = tmpStr.replace(`(${optionalMod})`, '');
      }
      return tmpStr;
    })();
    const requiredMods =
      requiredModsAcronymsString
        .match(/.{2}/g)
        ?.flat()
        ?.filter(uniquesFilter) ?? [];
    const mods: ModArg[] = [
      ...optionalModAcronyms.map(m => ({
        acronym: new ModAcronym(m),
        isOptional: true,
      })),
      ...requiredMods.map(m => ({
        acronym: new ModAcronym(m),
        isOptional: false,
      })),
    ];
    return mods;
  },
  unparse: function (value: ModArg[]): string {
    return (
      '+' +
      value.map(x => (x.isOptional ? `(${x.acronym})` : x.acronym)).join('')
    );
  },
};

export const MODE: CommandArgument<OsuRuleset> = {
  displayName: '-режим',
  description:
    'режим игры; возможные значения: ' +
    ALL_OSU_RULESETS.map(x => `«${x}»`).join(', '),
  get usageExample(): string {
    return '-' + pickRandom(ALL_OSU_RULESETS);
  },
  match: function (token: string): boolean {
    const modeRegex = new RegExp(`^-(${ALL_OSU_RULESETS.join('|')})$`, 'i');
    return modeRegex.test(token);
  },
  parse: function (token: string): OsuRuleset {
    const modeName = token.toLowerCase().replace('-', '');
    const ruleset = ALL_OSU_RULESETS.find(x => x.toLowerCase() === modeName);
    if (ruleset === undefined) {
      throw Error('Token should be a valid OsuRuleset key');
    }
    return OsuRuleset[ruleset];
  },
  unparse: function (value: OsuRuleset): string {
    return '-' + OsuRuleset[value];
  },
};

export const SCORE_COMBO: CommandArgument<number> = {
  displayName: '?x',
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

export const ACCURACY: CommandArgument<number> = {
  displayName: '?%',
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

export const SPEED_RATE: CommandArgument<number> = {
  displayName: '?.?x',
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

type ArgDA = {
  ar?: number;
  cs?: number;
  od?: number;
  hp?: number;
};

export const DIFFICULTY_ADJUST_SETTING: CommandArgument<ArgDA> = {
  displayName: 'ar?|cs?|od?|hp?',
  description: 'настройки для DA мода',
  get usageExample(): string {
    return pickRandom(['ar', 'cs', 'od', 'hp']) + pickRandom([6.7, 8, 9.5, 10]);
  },
  match: function (token: string): boolean {
    return /^(ar|cs|od|hp)\d+(\.\d)?$/i.test(token);
  },
  parse: function (token: string): ArgDA {
    const stats = token
      .split(' ')
      .map(x => x.toLowerCase().substring(0, 2)) as (keyof ArgDA)[];
    const output = {} as ArgDA;
    for (const stat of stats) {
      output[stat] = parseFloat(token.substring(2, token.length));
    }
    return output;
  },
  unparse: function (value: ArgDA): string {
    return ['ar', 'cs', 'od', 'hp']
      .filter(key => value[key as keyof ArgDA] !== undefined)
      .map(key => key + value[key as keyof ArgDA])
      .join(' ');
  },
};

export const WORD: (word: string) => CommandArgument<string> = word => ({
  displayName: word,
  description: `слово ${word}`,
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
  description: string
) => CommandArgument<string> = (name, description) => ({
  displayName: name,
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
  description: string
) => CommandArgument<string> = (name, description) => ({
  displayName: name,
  description: description,
  get usageExample(): string {
    return pickRandom(['любаястрока', 'другаястрока']);
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
  description: 'номер дня относительно сегодня',
  get usageExample(): string {
    const randInt = Math.floor(Math.random() * 5);
    const sign = pickRandom(['+', '-']);
    const pos = `${sign}${randInt}`;
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
    return `today{${value > 0 ? '+' : ''}${value}}`;
  },
};

export const DATE: CommandArgument<Date> = {
  displayName: 'дата|' + DAY_OFFSET.displayName,
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

export const NUMBER: (
  displayName: string,
  description: string,
  min: number | undefined,
  max: number | undefined
) => CommandArgument<number> = (displayName, description, min, max) => ({
  displayName: displayName,
  description: description,
  get usageExample(): string {
    const exampleMin = min ?? -999999;
    const exampleMax = max ?? 999999;
    const range = exampleMax - exampleMin;
    const randPos = exampleMin + Math.floor(Math.random() * (range + 1));
    return `${randPos}`;
  },
  match: function (token: string): boolean {
    const number = parseInt(token);
    if (isNaN(number)) {
      return false;
    }
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

export const APP_USER_ID = ANY_STRING(
  'ид_польз_прил',
  'ID пользователя приложения'
);
export const VK_USER_ID = NUMBER('ид_вк', 'ID пользователя VK', 0, 99999999);

export const BEATMAP_ID: CommandArgument<number> = (() => {
  const number_arg = NUMBER('', '', 0, 1e9);
  return {
    displayName: '*ид_карты',
    description: 'ID карты',
    get usageExample(): string {
      return '*' + number_arg.usageExample;
    },
    match: function (token: string): boolean {
      if (!token.startsWith('*')) {
        return false;
      }
      return number_arg.match(token.substring(1));
    },
    parse: function (token: string): number {
      return parseInt(token.substring(1));
    },
    unparse: function (value: number): string {
      return '*' + value;
    },
  };
})();

export const ALIAS_PATTERN: CommandArgument<string> = {
  displayName: 'свой_паттерн',
  description:
    'шаблон который нужно будет заменить; ' +
    'если в конце шаблона не стоит символ «*», ' +
    'то замена будет происходить при полном совпадении шаблона с сообщением, ' +
    'а если же «звездочку» поставить, то заменяться будет только начало сообщения',
  get usageExample(): string {
    return pickRandom(['моякоманда *', 'смотри', 'x*', '???']);
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
};

export const ALIAS_TARGET: CommandArgument<string> = {
  displayName: 'команда_бота',
  description: 'строка, которая будет заменять ваш шаблон',
  get usageExample(): string {
    return pickRandom(['l r ', 'l personalbest', 'l u', 'osubot-help']);
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
};

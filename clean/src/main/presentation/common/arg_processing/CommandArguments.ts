import {OsuServer} from '../../../../primitives/OsuServer';
import {SERVERS} from '../OsuServers';
import {pickRandom, uniquesFilter} from '../../../../primitives/Arrays';
import {CommandArgument} from './CommandArgument';
import {ModArg} from './ModArg';
import {CommandPrefixes} from '../CommandPrefixes';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../../primitives/OsuRuleset';
import {ModAcronym} from '../../../../primitives/ModAcronym';

export const SERVER_PREFIX: CommandArgument<OsuServer> = {
  displayName: 'server',
  description: 'буква или название сервера',
  get usageExample(): string {
    return pickRandom(SERVERS).prefix;
  },
  match: function (token: string): boolean {
    return SERVERS.getServerByPrefixIgnoringCase(token) !== undefined;
  },
  parse: function (token: string): OsuServer {
    return SERVERS.getServerByPrefixIgnoringCase(token)!;
  },
};

export class OWN_COMMAND_PREFIX implements CommandArgument<string> {
  displayName: string;
  description = undefined;
  get usageExample(): string {
    return pickRandom(this.prefixes);
  }
  match(): boolean {
    return true;
  }
  parse(token: string): string {
    return token;
  }

  private prefixes: CommandPrefixes;
  constructor(prefixes: CommandPrefixes) {
    this.prefixes = prefixes;
    this.displayName = prefixes.join('|');
  }
}

export const VK_FOREIGN_COMMAND_PREFIX: (
  validPrefixes: CommandPrefixes
) => CommandArgument<string> = validPrefixes => ({
  displayName: 'command',
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
});

export const USERNAME: CommandArgument<string> = {
  displayName: 'username',
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
};

type UsernameList = {
  usernames: string[];
  isAdditive: boolean;
};
export const USERNAME_LIST: CommandArgument<UsernameList> = {
  displayName: '~usernames',
  description:
    'ники игроков, через запятую; используйте вариант ~~name1,name2 ' +
    'для того чтобы ники "добавились" к никами этого чата',
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
    const usernames = token.replace('~', '').replace('~', '').split(',');
    const isAdditive = token.startsWith('~~');
    return {
      usernames: usernames,
      isAdditive: isAdditive,
    };
  },
};

export const START_POSITION: CommandArgument<number> = {
  displayName: '\\?',
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
};

export const QUANTITY: CommandArgument<number> = {
  displayName: ':?',
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
};

export const MODS: CommandArgument<ModArg[]> = {
  displayName: '+mods',
  description:
    'список модов; если мод указан в скобках, то его наличие допускается, но не является необходимым',
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
};

export const MODE: CommandArgument<OsuRuleset> = {
  displayName: 'mode=?',
  description:
    'режим игры; возможные значения: ' +
    ALL_OSU_RULESETS.map(x => `"${x}"`).join(', '),
  get usageExample(): string {
    return 'mode=' + pickRandom(ALL_OSU_RULESETS);
  },
  match: function (token: string): boolean {
    const modeRegex = new RegExp(
      `^${ALL_OSU_RULESETS.map(x => 'mode=' + x).join('|')}$`,
      'i'
    );
    return modeRegex.test(token);
  },
  parse: function (token: string): OsuRuleset {
    const modeName = token.replace('mode=', '');
    const ruleset = OsuRuleset[modeName as keyof typeof OsuRuleset];
    if (ruleset === undefined) {
      throw Error('Token should be a valid OsuRuleset key');
    }
    return ruleset;
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
    return parseInt(token.replace('x', ''));
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
    return parseInt(token.replace('xm', ''));
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
    return parseInt(token.replace('x50', ''));
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
    return parseInt(token.replace('x100', ''));
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
    return parseFloat(token.replace('x', ''));
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
    const stat = token.substring(0, 2) as 'ar' | 'cs' | 'od' | 'hp';
    const output = {} as ArgDA;
    output[stat] = parseFloat(token.substring(2, token.length));
    return output;
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
});

export const ANY_WORD: (
  name: string,
  description: string
) => CommandArgument<string> = (name, description) => ({
  displayName: name,
  description: description,
  get usageExample(): string {
    return pickRandom(['something', 'othersomething']);
  },
  match: function (token: string): boolean {
    return /^\w+$/.test(token);
  },
  parse: function (token: string): string {
    return token;
  },
});

export const ANY_STRING: (
  name: string,
  description: string
) => CommandArgument<string> = (name, description) => ({
  displayName: name,
  description: description,
  get usageExample(): string {
    return pickRandom(['something', 'othersomething']);
  },
  match: function (): boolean {
    return true;
  },
  parse: function (token: string): string {
    return token;
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
    return parseInt(token.replace('today{', '').replace('}', '')) || 0;
  },
};

export const DATE: CommandArgument<Date> = {
  displayName: 'date|today[±?]',
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
});

export const APP_USER_ID = ANY_STRING(
  'app_user_id',
  'ID пользователя приложения'
);
export const VK_USER_ID = NUMBER('vk_id', 'ID пользователя VK', 0, 99999999);

import {OsuServer} from '../../../../primitives/OsuServer';
import {SERVERS} from '../OsuServers';
import {pickRandom, uniquesFilter} from '../../../../primitives/Arrays';
import {CommandArgument} from './CommandArgument';
import {ModArg} from './ModArg';
import {CommandPrefixes} from '../CommandPrefixes';
import {ALL_OSU_RULESETS, OsuRuleset} from '../../../../primitives/OsuRuleset';

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

export const START_POSITION: CommandArgument<number> = {
  displayName: '\\position',
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
  displayName: ':quantity',
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
    const modsString = token.substring(1).toUpperCase();
    const optionalMods =
      modsString
        .match(/\(.{2}\)/g)
        ?.flat()
        ?.filter(uniquesFilter)
        ?.map(s => s.substring(1, 3)) ?? [];
    let noOptionalModsString = modsString;
    for (const optionalMod of optionalMods) {
      noOptionalModsString = noOptionalModsString.replace(
        `(${optionalMod})`,
        ''
      );
    }
    const requiredMods =
      noOptionalModsString.match(/.{2}/g)?.flat()?.filter(uniquesFilter) ?? [];
    const mods: ModArg[] = [
      ...optionalMods.map(m => ({acronym: m, isOptional: true})),
      ...requiredMods.map(m => ({acronym: m, isOptional: false})),
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
    return pickRandom(['foo', 'bar']);
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
    return pickRandom(['foo123!', '321[]bar']);
  },
  match: function (): boolean {
    return true;
  },
  parse: function (token: string): string {
    return token;
  },
});

export const DAY_OFFSET: CommandArgument<number> = {
  displayName: 'today{±N}',
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
  displayName: 'date|today[±N]',
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
  description: string,
  min: number | undefined,
  max: number | undefined
) => CommandArgument<number> = (description, min, max) => ({
  displayName: 'N',
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

export const APP_USER_ID = ANY_STRING('ID', 'ID пользователя приложения');
export const VK_USER_ID = NUMBER('ID пользователя VK', 0, +Infinity);

import {OsuServer} from '../../../../primitives/OsuServer';
import {SERVERS} from '../OsuServers';
import {pickRandom, uniquesFilter} from '../../../../primitives/Arrays';
import {CommandArgument} from './CommandArgument';
import {SetUsername} from '../../vk/commands/SetUsername';
import {UserInfo} from '../../vk/commands/UserInfo';
import {UserRecentPlays} from '../../vk/commands/UserRecentPlays';
import {Help} from '../../vk/commands/Help';
import {CommandPrefixes} from '../../vk/commands/base/VkCommand';
import {ModArg} from './ModArg';

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

export const OWN_COMMAND_PREFIX: CommandArgument<string> = {
  displayName: '~',
  description: '~',
  usageExample: '~',
  match: function (): boolean {
    return true;
  },
  parse: function (token: string): string {
    return token;
  },
};

export const VK_FOREIGN_COMMAND_PREFIX: CommandArgument<string> = {
  displayName: 'command',
  description: 'буква или название команды',
  get usageExample(): string {
    const somePrefixes = [
      ...SetUsername.prefixes,
      ...UserInfo.prefixes,
      ...UserRecentPlays.prefixes,
    ];
    return pickRandom(somePrefixes);
  },
  match: function (token: string): boolean {
    const allPrefixes = new CommandPrefixes(
      ...Help.prefixes,
      ...SetUsername.prefixes,
      ...UserInfo.prefixes,
      ...UserRecentPlays.prefixes
    );
    return allPrefixes.matchIgnoringCase(token);
  },
  parse: function (token: string): string {
    return token;
  },
};

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
    'список модов (одной строкой без пробелов); в скобках указываются допустимые, но не обязательные моды',
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
      // eslint-disable-next-line prettier/prettier
      noOptionalModsString
        .match(/.{2}/g)
        ?.flat()
        ?.filter(uniquesFilter) ?? [];
    const mods: ModArg[] = [
      ...optionalMods.map(m => ({acronym: m, isOptional: true})),
      ...requiredMods.map(m => ({acronym: m, isOptional: false})),
    ];
    return mods;
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
      const tmpDate = new Date();
      tmpDate.setUTCHours(0, 0, 0, 0);
      tmpDate.setUTCDate(tmpDate.getUTCDate() + offset);
      return tmpDate;
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

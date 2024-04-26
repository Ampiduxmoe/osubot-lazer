import {OsuServer} from '../../../../primitives/OsuServer';
import {SERVERS} from '../OsuServers';
import {pickRandom, uniquesFilter} from '../../../../primitives/Arrays';
import {CommandArgument} from './CommandArgument';
import {SetUsername} from '../../vk/commands/SetUsername';
import {UserInfo} from '../../vk/commands/UserInfo';
import {UserRecentPlays} from '../../vk/commands/UserRecentPlays';
import {Help} from '../../vk/commands/Help';
import {CommandPrefixes} from '../../vk/commands/base/VkCommand';

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

export const MODS: CommandArgument<string[]> = {
  displayName: '+mods',
  description: 'список модов (одной строкой без пробелов)',
  get usageExample(): string {
    const maybeHd = pickRandom(['hd', 'HD', '']);
    const dtOrHr = pickRandom(['dt', 'DT', 'hr', 'HR']);
    return `+${maybeHd}${dtOrHr}`;
  },
  match: function (token: string): boolean {
    const modsRegex = /^\+([a-zA-Z]{2})+$/;
    return modsRegex.test(token);
  },
  parse: function (token: string): string[] {
    return token
      .substring(1)
      .toUpperCase()
      .match(/.{2}/g)!
      .flat()
      .filter(uniquesFilter);
  },
};

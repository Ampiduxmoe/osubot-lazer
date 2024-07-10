export type AppUserCommandAliasesKey = {
  appUserId: string;
};

export type AppUserCommandAliases = AppUserCommandAliasesKey & {
  aliases: {pattern: string; replacement: string}[];
};

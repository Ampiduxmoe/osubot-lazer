export interface CommandArgument<T> {
  readonly displayName: string;
  readonly description: string;
  readonly usageExample: string;
  match(token: string): boolean;
  parse(token: string): T;
}

export interface CommandArgument<T> {
  readonly displayName: string;
  readonly description: string | undefined;
  readonly usageExample: string;
  match(token: string): boolean;
  parse(token: string): T;
  unparse(value: T): string;
}

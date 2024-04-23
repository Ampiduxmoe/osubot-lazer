export interface CommandArgument<T> {
  displayName: string;
  description: string;
  usageExample: string;
  match(token: string): boolean;
  parse(token: string): T;
}

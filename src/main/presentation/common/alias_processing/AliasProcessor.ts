export interface AliasProcessor {
  match(text: string, pattern: string): boolean;
  process(text: string, pattern: string, replacement: string): string;
}

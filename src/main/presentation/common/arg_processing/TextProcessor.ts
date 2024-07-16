export interface TextProcessor {
  tokenize(text: string): string[];
  detokenize(tokens: string[]): string;
}

export class CommandPrefixes extends Array<string> {
  constructor(...prefixes: string[]) {
    super(...prefixes);
  }
  match(s: string) {
    return this.find(x => x === s) !== undefined;
  }
  matchIgnoringCase(s: string) {
    return this.find(x => x.toLowerCase() === s.toLowerCase()) !== undefined;
  }
}

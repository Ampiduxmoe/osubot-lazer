export class ModAcronym extends String {
  constructor(acronym: string) {
    super(acronym.toUpperCase());
  }

  is(acronym: string | ModAcronym): boolean {
    if (acronym instanceof ModAcronym) {
      return this.toString() === acronym.toString();
    }
    return this.toString() === new ModAcronym(acronym).toString();
  }

  isAnyOf(...acronyms: string[] | ModAcronym[]): boolean {
    return acronyms.find(x => this.is(x)) !== undefined;
  }

  static listContains(acronym: string, list: ModAcronym[]): boolean {
    return new ModAcronym(acronym).isAnyOf(...list);
  }

  static createMany(...acronyms: string[]): ModAcronym[] {
    return acronyms.map(s => new ModAcronym(s));
  }
}

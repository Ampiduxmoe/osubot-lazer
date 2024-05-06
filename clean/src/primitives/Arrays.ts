export function uniquesFilter<T>(value: T, index: number, array: T[]) {
  return array.indexOf(value) === index;
}

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function sumBy<T>(fn: (x: T) => number, array: T[]): number {
  return array.reduce((partialSum, a) => partialSum + fn(a), 0);
}

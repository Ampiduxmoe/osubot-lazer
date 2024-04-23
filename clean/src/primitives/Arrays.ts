export function uniquesFilter<T>(value: T, index: number, array: T[]) {
  return array.indexOf(value) === index;
}

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

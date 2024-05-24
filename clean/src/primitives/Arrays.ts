export function uniquesFilter<T>(value: T, index: number, array: T[]) {
  return array.indexOf(value) === index;
}

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function sumBy<T>(fn: (x: T) => number, array: T[]): number {
  return array.reduce((partialSum, a) => partialSum + fn(a), 0);
}

export function maxBy<T>(fn: (x: T) => number, array: T[]): T | undefined {
  let maxElement = array[0];
  if (maxElement === undefined) {
    return undefined;
  }
  let max = fn(maxElement);
  for (const x of array) {
    const elementValue = fn(x);
    if (elementValue > max) {
      maxElement = x;
      max = elementValue;
    }
  }
  return maxElement;
}

export function maxOf<T>(fn: (x: T) => number, array: T[]): number | undefined {
  const maxElement = maxBy(fn, array);
  if (maxElement === undefined) {
    return undefined;
  }
  return fn(maxElement);
}

export function minBy<T>(fn: (x: T) => number, array: T[]): T | undefined {
  let minElement = array[0];
  if (minElement === undefined) {
    return undefined;
  }
  let min = fn(minElement);
  for (const x of array) {
    const elementValue = fn(x);
    if (elementValue < min) {
      minElement = x;
      min = elementValue;
    }
  }
  return minElement;
}

export function minOf<T>(fn: (x: T) => number, array: T[]): number | undefined {
  const minElement = minBy(fn, array);
  if (minElement === undefined) {
    return undefined;
  }
  return fn(minElement);
}

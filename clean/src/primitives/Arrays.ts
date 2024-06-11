export function uniquesFilter<T>(value: T, index: number, array: readonly T[]) {
  return array.indexOf(value) === index;
}

export function pickRandom<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function sum(array: readonly number[]): number {
  return sumBy(x => x, array);
}

export function sumBy<T>(fn: (x: T) => number, array: readonly T[]): number {
  return array.reduce((partialSum, a) => partialSum + fn(a), 0);
}

export function max(array: readonly number[]): number {
  return maxBy(x => x, array);
}

export function maxBy<T>(fn: (x: T) => number, array: readonly T[]): T {
  if (array.length === 0) {
    throw Error('Array should contain at least one element');
  }
  let maxElement = array[0];
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

export function maxOf<T>(fn: (x: T) => number, array: readonly T[]): number {
  const maxElement = maxBy(fn, array);
  return fn(maxElement);
}

export function min(array: readonly number[]): number {
  return minBy(x => x, array);
}

export function minBy<T>(fn: (x: T) => number, array: readonly T[]): T {
  if (array.length === 0) {
    throw Error('Array should contain at least one element');
  }
  let minElement = array[0];
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

export function minOf<T>(fn: (x: T) => number, array: readonly T[]): number {
  const minElement = minBy(fn, array);
  return fn(minElement);
}

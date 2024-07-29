export function uniquesFilter<T>(
  value: T,
  index: number,
  array: readonly T[]
): boolean {
  return array.indexOf(value) === index;
}

export function createUniquesFilter<T>(
  equalFn: (a: T, b: T) => boolean
): (value: T, index: number, array: readonly T[]) => boolean {
  return (value, index, array) => {
    const sameValue = array.find(x => equalFn(x, value));
    if (sameValue === undefined) {
      return true;
    }
    return array.indexOf(sameValue) === index;
  };
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

export async function sumByAsync<T>(
  fn: (x: T) => Promise<number>,
  array: readonly T[]
): Promise<number> {
  const transformResult = await Promise.all(array.map(x => fn(x)));
  return sum(transformResult);
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

export async function maxByAsync<T>(
  fn: (x: T) => Promise<number>,
  array: readonly T[]
): Promise<T> {
  const elementTransofmResults = await Promise.all(
    array.map(async e => ({
      e: e,
      transformResult: await fn(e),
    }))
  );
  return maxBy(x => x.transformResult, elementTransofmResults).e;
}

export function maxOf<T>(fn: (x: T) => number, array: readonly T[]): number {
  const maxElement = maxBy(fn, array);
  return fn(maxElement);
}

export async function maxOfAsync<T>(
  fn: (x: T) => Promise<number>,
  array: readonly T[]
): Promise<number> {
  const maxElement = await maxByAsync(fn, array);
  return await fn(maxElement);
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

export async function minByAsync<T>(
  fn: (x: T) => Promise<number>,
  array: readonly T[]
): Promise<T> {
  const elementTransofmResults = await Promise.all(
    array.map(async e => ({
      e: e,
      transformResult: await fn(e),
    }))
  );
  return minBy(x => x.transformResult, elementTransofmResults).e;
}

export function minOf<T>(fn: (x: T) => number, array: readonly T[]): number {
  const minElement = minBy(fn, array);
  return fn(minElement);
}

export async function minOfAsync<T>(
  fn: (x: T) => Promise<number>,
  array: readonly T[]
): Promise<number> {
  const maxElement = await minByAsync(fn, array);
  return await fn(maxElement);
}

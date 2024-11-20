/** Creates a promise that resolves after set amount of time */
export function wait(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

/** Alias for {@link wait}. Goes better with 'await' keyword */
export const delay = wait;

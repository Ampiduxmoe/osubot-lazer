export function withTimingLogs<T>(
  fn: () => T,
  initialMessage: (startTime: number) => string | undefined,
  finalMessage: (
    endTime: number,
    delta: number,
    result: T
  ) => string | undefined
): T {
  const startTime = Date.now();
  const firstMessage = initialMessage(startTime);
  if (firstMessage !== undefined) {
    console.log(firstMessage);
  }
  const logFinalMessageIfNeeded = (resultValue: T): void => {
    const endTime = Date.now();
    const delta = endTime - startTime;
    const message = finalMessage(endTime, delta, resultValue);
    if (message !== undefined) {
      console.log(message);
    }
  };
  const executionResult = fn();
  if (executionResult instanceof Promise) {
    return executionResult.then(res => {
      logFinalMessageIfNeeded(res);
      return res;
    }) as T;
  }
  logFinalMessageIfNeeded(executionResult);
  return executionResult;
}

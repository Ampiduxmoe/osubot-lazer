import {AxiosError} from 'axios';

export function catchedValueToError(value: unknown): Error | undefined {
  if (value instanceof AxiosError) {
    return Error(value.message);
  } else if (value instanceof Error) {
    return value;
  } else if (value instanceof String) {
    return Error(value.toString());
  }
  return undefined;
}

export function stringifyErrors(errors: Error[]): string {
  if (errors.length === 0) {
    return '';
  }
  let s = `[0]: ${errors[0].message}`;
  for (let i = 1; i < errors.length; i++) {
    s += `\n[${i}]: ${errors[i].message}`;
  }
  return s;
}

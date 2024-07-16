export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function round(value: number, decimalPlaces: number): number {
  return Number(
    Math.round(+`${value}e${decimalPlaces}`) + 'e-' + decimalPlaces
  );
}

export function integerShortForm(value: number): string {
  const [dividedNumber, postfix] = (() => {
    if (value < 1e3) {
      return [value, ''];
    }
    if (value < 1e6) {
      return [value / 1e3, 'k'];
    }
    if (value < 1e9) {
      return [value / 1e6, 'm'];
    }
    return [value / 1e9, 'b'];
  })();
  const decimalPlaces = (() => {
    if (dividedNumber < 10) {
      return 2;
    }
    if (dividedNumber < 100) {
      return 1;
    }
    return 0;
  })();
  return round(dividedNumber, decimalPlaces).toString() + postfix;
}

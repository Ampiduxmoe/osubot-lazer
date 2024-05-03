export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function round(value: number, decimalPlaces: number): number {
  return Number(
    Math.round(+`${value}e${decimalPlaces}`) + 'e-' + decimalPlaces
  );
}

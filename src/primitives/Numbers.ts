export function round(value: number, decimalPlaces: number) {
  return Number(
    Math.round(+`${value}e${decimalPlaces}`) + 'e-' + decimalPlaces
  );
}

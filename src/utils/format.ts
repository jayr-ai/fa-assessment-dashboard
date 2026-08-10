export function formatScore(value: number | null): string {
  if (value === null) return '–';
  return (Math.round(value * 100) / 100).toString();
}

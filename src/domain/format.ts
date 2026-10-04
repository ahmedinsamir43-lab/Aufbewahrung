/**
 * Zahlenformatierung im deutschen Format (Tausenderpunkt, Dezimalkomma), unabhängig von der
 * Intl-Unterstützung der JavaScript-Engine.
 */
export function formatNumber(value: number, maxFractionDigits = 0): string {
  const factor = 10 ** maxFractionDigits;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [intPart, fracPart] = rounded.toFixed(maxFractionDigits).split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const trimmedFrac = fracPart?.replace(/0+$/, '');
  const sign = value < 0 && rounded !== 0 ? '−' : '';
  return `${sign}${withDots}${trimmedFrac ? `,${trimmedFrac}` : ''}`;
}

/** Vorzeichenbehaftete Zahl, z. B. „+300" oder „−500". */
export function formatSigned(value: number): string {
  if (value === 0) return '±0';
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

/** „1 Woche" bzw. „17 Wochen". */
export function formatWeeks(weeks: number): string {
  return weeks === 1 ? '1 Woche' : `${weeks} Wochen`;
}

/** Ergänzende Monatsangabe ab 12 Wochen, z. B. „etwa 4 Monate"; sonst `null`. */
export function approxMonths(weeks: number): string | null {
  if (weeks < 12) return null;
  return `etwa ${Math.round((weeks * 7) / 30.44)} Monate`;
}

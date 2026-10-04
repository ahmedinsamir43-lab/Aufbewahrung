/** Lokales Kalenderdatum im Format `YYYY-MM-DD` (nicht UTC, damit ein Tag um Mitternacht wechselt). */
export function toLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parst `YYYY-MM-DD` als lokales Datum (12:00 Uhr, robust gegenüber Zeitumstellungen). */
export function fromLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toLocalDate(fromLocalDate(value)) === value;
}

export function addDays(iso: string, days: number): string {
  const d = fromLocalDate(iso);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];

/** „Heute", „Gestern" oder z. B. „Fr., 2. Okt." */
export function formatDayLabel(iso: string, today: string = toLocalDate()): string {
  if (iso === today) return 'Heute';
  if (iso === addDays(today, -1)) return 'Gestern';
  const d = fromLocalDate(iso);
  const year = d.getFullYear() !== fromLocalDate(today).getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}${year}`;
}

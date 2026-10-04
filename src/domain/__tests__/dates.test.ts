import { addDays, formatDayLabel, fromLocalDate, isLocalDate, toLocalDate } from '../dates';

describe('Datumsfunktionen', () => {
  it('toLocalDate / fromLocalDate sind umkehrbar', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDate(fromLocalDate('2026-10-04'))).toBe('2026-10-04');
  });

  it('addDays über Monats- und Jahresgrenzen sowie Zeitumstellung', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // Sommerzeit
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // Winterzeit
  });

  it('isLocalDate', () => {
    expect(isLocalDate('2026-10-04')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('04.10.2026')).toBe(false);
    expect(isLocalDate(undefined)).toBe(false);
  });

  it('formatDayLabel', () => {
    expect(formatDayLabel('2026-10-04', '2026-10-04')).toBe('Heute');
    expect(formatDayLabel('2026-10-03', '2026-10-04')).toBe('Gestern');
    expect(formatDayLabel('2026-10-02', '2026-10-04')).toBe('Fr., 2. Okt.');
    expect(formatDayLabel('2025-12-24', '2026-10-04')).toBe('Mi., 24. Dez. 2025');
  });
});

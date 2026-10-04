import { approxMonths, formatNumber, formatSigned, formatWeeks } from '../format';

describe('Formatierung', () => {
  it('formatNumber mit Tausenderpunkt und Dezimalkomma', () => {
    expect(formatNumber(2259)).toBe('2.259');
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(72.5, 1)).toBe('72,5');
    expect(formatNumber(72, 1)).toBe('72');
    expect(formatNumber(-500)).toBe('−500');
    expect(formatNumber(-0.2)).toBe('0');
    expect(formatNumber(999.6)).toBe('1.000');
  });

  it('formatSigned', () => {
    expect(formatSigned(300)).toBe('+300');
    expect(formatSigned(-500)).toBe('−500');
    expect(formatSigned(0)).toBe('±0');
  });

  it('formatWeeks und approxMonths', () => {
    expect(formatWeeks(1)).toBe('1 Woche');
    expect(formatWeeks(17)).toBe('17 Wochen');
    expect(approxMonths(11)).toBeNull();
    expect(approxMonths(17)).toBe('etwa 4 Monate');
  });
});

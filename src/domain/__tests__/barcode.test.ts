import { expandUpcE, gtinCheckDigit, hasValidCheckDigit, normalizeBarcode } from '../barcode';

describe('GTIN-Prüfziffer', () => {
  it('berechnet die Prüfziffer (EAN-13, EAN-8, UPC-A)', () => {
    expect(gtinCheckDigit('400638133393')).toBe(1); // 4006381333931
    expect(gtinCheckDigit('9638507')).toBe(4); // 96385074
    expect(gtinCheckDigit('03600029145')).toBe(2); // 036000291452
  });

  it('erkennt gültige und ungültige Codes', () => {
    expect(hasValidCheckDigit('4006381333931')).toBe(true);
    expect(hasValidCheckDigit('4006381333932')).toBe(false);
    expect(hasValidCheckDigit('96385074')).toBe(true);
    expect(hasValidCheckDigit('12345')).toBe(false);
    expect(hasValidCheckDigit('abcdefgh')).toBe(false);
  });
});

describe('UPC-E', () => {
  it.each([
    ['04252614', '042100005264'],
    ['01234565', '012345000065'],
    ['01234133', '012300000413'],
    ['01234146', '012340000016'],
  ])('%s → %s', (upcE, upcA) => {
    expect(expandUpcE(upcE)).toBe(upcA);
  });

  it('lehnt ungültige Zahlensysteme ab', () => {
    expect(expandUpcE('21234565')).toBeNull();
  });
});

describe('normalizeBarcode', () => {
  it('lässt EAN-13 und EAN-8 unverändert', () => {
    expect(normalizeBarcode('3017624010701')).toBe('3017624010701');
    expect(normalizeBarcode('96385074')).toBe('96385074');
  });

  it('wandelt UPC-A in EAN-13 um', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
  });

  it('wandelt UPC-E über UPC-A in EAN-13 um', () => {
    expect(normalizeBarcode('04252614', 'upc_e')).toBe('0042100005264');
  });

  it('entfernt Leerzeichen und weist Fehllesungen ab', () => {
    expect(normalizeBarcode(' 3017 6240 10701 ')).toBe('3017624010701');
    expect(normalizeBarcode('3017624010702')).toBeNull();
    expect(normalizeBarcode('https://example.org')).toBeNull();
    expect(normalizeBarcode('123')).toBeNull();
  });
});

/**
 * Prüfung und Normalisierung von Handelsbarcodes (GTIN): EAN-13, EAN-8, UPC-A, UPC-E.
 * Prüfziffernverfahren nach GS1 (Modulo 10, Gewichtung 3/1 von rechts).
 */

export function gtinCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = body.charCodeAt(body.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function hasValidCheckDigit(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  return gtinCheckDigit(code.slice(0, -1)) === Number(code[code.length - 1]);
}

/** Erweitert einen 8-stelligen UPC-E-Code (Zahlensystem 0/1) auf UPC-A (12 Stellen). */
export function expandUpcE(upcE: string): string | null {
  if (!/^[01]\d{7}$/.test(upcE)) return null;
  const ns = upcE[0];
  const d = upcE.slice(1, 7);
  const check = upcE[7];
  const last = d[5];
  let body: string;
  if (last <= '2') body = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`;
  else if (last === '3') body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
  else if (last === '4') body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
  else body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`;
  return `${ns}${body}${check}`;
}

/**
 * Normalisiert einen gescannten Code auf die in Open Food Facts übliche Form
 * (EAN-13 für UPC-A, EAN-8 bleibt EAN-8). Gibt `null` bei ungültigem Code zurück.
 */
export function normalizeBarcode(raw: string, type?: string): string | null {
  const code = raw.trim().replace(/\s/g, '');
  if (!/^\d+$/.test(code)) return null;

  if (type === 'upc_e' && code.length === 8) {
    const upcA = expandUpcE(code);
    return upcA && hasValidCheckDigit(upcA) ? `0${upcA}` : null;
  }
  if (code.length === 12) return hasValidCheckDigit(code) ? `0${code}` : null;
  if (code.length === 8 || code.length === 13) return hasValidCheckDigit(code) ? code : null;
  if (code.length === 14) return hasValidCheckDigit(code) ? code.replace(/^0/, '') : null;
  return null;
}

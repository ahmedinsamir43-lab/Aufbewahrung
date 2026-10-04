/**
 * Abgleich eines Lebensmittels mit den gemiedenen Lebensmitteln aus dem Profil.
 *
 * Bewusst einfache, nachvollziehbare Heuristik (kein Allergen-Nachweis!):
 * Normalisierung (Kleinschreibung, Umlaute, ß) und Rückführung häufiger deutscher
 * Pluralendungen, sodass z. B. „Erdnüsse" auch „Erdnussbutter" trifft.
 */

export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Rückführung auf einen Wortstamm; Stämme kürzer als 3 Zeichen werden nicht weiter gekürzt. */
export function stem(term: string): string {
  const n = normalize(term).trim();
  for (const suffix of ['innen', 'en', 'er', 'e', 'n', 's']) {
    if (n.endsWith(suffix) && n.length - suffix.length >= 4) return n.slice(0, -suffix.length);
  }
  return n;
}

/** Liefert die gemiedenen Begriffe, die in Name, Marke oder Zutaten vorkommen. */
export function findAvoidMatches(
  avoidTerms: readonly string[],
  ...texts: (string | null | undefined)[]
): string[] {
  const haystack = normalize(texts.filter(Boolean).join(' '));
  if (!haystack) return [];
  return avoidTerms.filter((term) => {
    const s = stem(term);
    return s.length >= 3 && haystack.includes(s);
  });
}

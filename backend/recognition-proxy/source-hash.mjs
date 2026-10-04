// Prüfwert über alle Quelldateien des Workers – erkennt eine veraltete dist/worker.js.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export function sourceFiles() {
  const src = join(root, 'src');
  const files = readdirSync(src)
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => join(src, f));
  return [...files, join(root, '../../src/domain/recognition.ts')];
}

export function sourceHash() {
  const h = createHash('sha256');
  for (const file of sourceFiles()) h.update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
  return h.digest('hex').slice(0, 16);
}

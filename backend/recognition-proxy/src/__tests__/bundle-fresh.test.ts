/**
 * @jest-environment node
 *
 * dist/worker.js wird im Cloudflare-Browser-Editor eingefügt und muss zum Quellcode passen.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');

it('dist/worker.js ist aktuell (sonst: npm run bundle im Ordner backend/recognition-proxy)', () => {
  const expected = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', "import { sourceHash } from './source-hash.mjs'; process.stdout.write(sourceHash());"],
    { cwd: root, encoding: 'utf8' },
  );
  const header = readFileSync(join(root, 'dist', 'worker.js'), 'utf8').slice(0, 600);
  expect(header).toContain(`// source-hash: ${expected}`);
});

// Erzeugt dist/worker.js: eine einzelne Datei zum Einfügen im Cloudflare-Browser-Editor.
// Aufruf: npm run bundle
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { sourceHash } from './source-hash.mjs';

execSync('npx wrangler deploy --dry-run --outdir .bundle', { stdio: 'inherit' });
const code = readFileSync('.bundle/index.js', 'utf8').replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n');
const header = `// Nährwert – Foto-Erkennung (Cloudflare Worker)
// ERZEUGTE DATEI – nicht von Hand bearbeiten. Quelle: backend/recognition-proxy/src, Befehl: npm run bundle
// Vollständig kopieren und im Cloudflare-Editor den gesamten Inhalt von worker.js ersetzen.
// Benötigte Secrets: APP_TOKEN, GEMINI_API_KEY. Optional (Variable): GEMINI_MODEL.
// source-hash: ${sourceHash()}

`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/worker.js', header + code);
rmSync('.bundle', { recursive: true, force: true });
console.log('dist/worker.js geschrieben');

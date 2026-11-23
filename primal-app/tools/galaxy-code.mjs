// Prints the hash to paste in src/galaxy/codes.ts for a Galaxy unlock code.
// Usage: node tools/galaxy-code.mjs MONCODE
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const code = process.argv[2];
if (!code) { console.error('Usage: node tools/galaxy-code.mjs MONCODE'); process.exit(1); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(mkdtempSync(join(tmpdir(), 'galaxy-')), 'codes.mjs');
const stub = join(root, 'tests/stub-native.js');
execFileSync('npx', ['esbuild', join(root, 'src/galaxy/codes.ts'), '--bundle', '--format=esm', '--platform=node', `--alias:@react-native-async-storage/async-storage=${stub}`, `--alias:react-native=${stub}`, `--outfile=${out}`, '--log-level=error'], { stdio: 'inherit' });
const { hashCode, normalizeCode } = await import(out);
console.log(`${normalizeCode(code)} → '${hashCode(code)}'`);

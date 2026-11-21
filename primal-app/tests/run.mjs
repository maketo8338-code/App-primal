// Bundles tests/*.test.ts with esbuild (native modules stubbed) and runs them with node:test.
//   npm test              → compare with the saved reference results
//   npm test -- --update  → rewrite the reference (only after an intended change)
import { build } from 'esbuild';
import { readdirSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.build');
mkdirSync(out, { recursive: true });
const stub = join(here, 'stub-native.js');
const tests = readdirSync(here).filter((f) => f.endsWith('.test.ts'));
for (const file of tests) {
  await build({ entryPoints: [join(here, file)], bundle: true, platform: 'node', format: 'cjs', outfile: join(out, file.replace('.ts', '.cjs')), logLevel: 'warning',
    alias: { '@react-native-async-storage/async-storage': stub, 'react-native': stub, 'expo-notifications': stub } });
}
const env = { ...process.env, UPDATE_GOLDEN: process.argv.includes('--update') ? '1' : '' };
const res = spawnSync(process.execPath, ['--test', ...tests.map((f) => join(out, f.replace('.ts', '.cjs')))], { stdio: 'inherit', env });
process.exit(res.status ?? 1);

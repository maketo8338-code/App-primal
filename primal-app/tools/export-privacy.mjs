// Exporte la politique de confidentialité (src/legal/privacy.ts) en Markdown, prête à héberger.
// Usage : node tools/export-privacy.mjs   →   legal/politique-confidentialite.md + legal/privacy-policy.md
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(mkdtempSync(join(tmpdir(), 'privacy-')), 'privacy.mjs');
execFileSync('npx', ['esbuild', join(root, 'src/legal/privacy.ts'), '--format=esm', `--outfile=${out}`, '--log-level=error'], { stdio: 'inherit' });
const { PRIVACY_FR, PRIVACY_EN, policyToMarkdown } = await import(out);
mkdirSync(join(root, 'legal'), { recursive: true });
writeFileSync(join(root, 'legal/politique-confidentialite.md'), policyToMarkdown(PRIVACY_FR));
writeFileSync(join(root, 'legal/privacy-policy.md'), policyToMarkdown(PRIVACY_EN));
console.log('legal/politique-confidentialite.md et legal/privacy-policy.md écrits.');

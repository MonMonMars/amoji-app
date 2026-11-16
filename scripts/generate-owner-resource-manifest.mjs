#!/usr/bin/env node
/**
 * Regenerate docs/owner-resource-manifest.json from apps/web/lib/owner-resource-manifest.ts
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'apps/web');
const out = path.join(root, 'docs/owner-resource-manifest.json');
const runner = path.join(web, 'scripts/_write-owner-resource-manifest.ts');

const src = `import fs from 'node:fs';
import path from 'node:path';
import {
  OWNER_CMA_ARCHIVE,
  OWNER_CMA_DELETE,
  OWNER_CMA_WANT,
  OWNER_FROZEN_CC0_CHARACTER_IDS,
  OWNER_RESOURCE_MANIFEST_VERSION,
  OWNER_WANT_CAST_RELEASE,
  OWNER_WANT_CHARACTER_IDS,
  buildOwnerResourceIndex,
  ownerIdleLibraryStats,
} from '../lib/owner-resource-manifest.ts';

const payload = {
  version: OWNER_RESOURCE_MANIFEST_VERSION,
  generatedAt: new Date().toISOString(),
  wantCastRelease: OWNER_WANT_CAST_RELEASE,
  stats: ownerIdleLibraryStats(),
  cmaWant: [...OWNER_CMA_WANT],
  cmaArchive: [...OWNER_CMA_ARCHIVE],
  cmaDelete: [...OWNER_CMA_DELETE],
  wantCharacterIds: [...OWNER_WANT_CHARACTER_IDS],
  frozenCc0CharacterIds: [...OWNER_FROZEN_CC0_CHARACTER_IDS],
  entries: buildOwnerResourceIndex(),
};

const outPath = path.join('..', '..', 'docs', 'owner-resource-manifest.json');
fs.writeFileSync(outPath, \`\${JSON.stringify(payload, null, 2)}\\n\`);
console.log('wrote', path.resolve(outPath));
`;

fs.mkdirSync(path.dirname(runner), { recursive: true });
fs.writeFileSync(runner, src);

try {
  execFileSync(
    'npx',
    ['--yes', 'tsx', '--tsconfig', 'tsconfig.json', runner],
    { cwd: web, stdio: 'inherit' },
  );
} finally {
  try {
    fs.unlinkSync(runner);
  } catch {
    /* */
  }
}

if (!fs.existsSync(out)) {
  process.exitCode = 1;
  console.error('generate-owner-resource-manifest: missing', out);
}
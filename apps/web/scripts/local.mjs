#!/usr/bin/env node
/**
 * One-command local run: build the static export only when it is stale, then
 * serve it. No network, no GitHub, no deploy.
 *
 *   npm run local              # build if needed, then serve on :4173
 *   npm run local -- 8080      # custom port
 *   npm run local -- --fresh   # force a rebuild even if out/ looks current
 *
 * "Stale" means out/revision.txt disagrees with APP_REVISION in lib/revision.ts,
 * or out/ is missing. That is the same signal the deployed site uses, so what
 * you see locally is byte-for-byte the revision the app reports.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const webRoot = resolve(here, '..');
const args = process.argv.slice(2);
const fresh = args.includes('--fresh');
const port = args.find((a) => /^\d+$/.test(a));

async function readRevision() {
  try {
    const src = await readFile(resolve(webRoot, 'lib', 'revision.ts'), 'utf8');
    return /export const APP_REVISION = '([^']+)'/.exec(src)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function readBuiltRevision() {
  try {
    return (await readFile(resolve(webRoot, 'out', 'revision.txt'), 'utf8')).trim();
  } catch {
    return null;
  }
}

const want = await readRevision();
const have = await readBuiltRevision();
const stale = fresh || !have || (want && want !== have);

if (stale) {
  console.log(`[amoji-local] building (have ${have ?? 'nothing'}, want ${want ?? 'unknown'}) …`);
  const build = spawn('npm', ['run', 'build'], {
    cwd: webRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, AMOJI_EXPORT: '1' },
  });
  const code = await new Promise((r) => build.on('exit', r));
  if (code !== 0) {
    console.error('[amoji-local] build failed — not starting the server');
    process.exit(code ?? 1);
  }
} else {
  console.log(`[amoji-local] out/ is current at ${have} — skipping build`);
}

const serve = spawn('node', ['scripts/serve-local.mjs', ...(port ? [port] : [])], {
  cwd: webRoot,
  stdio: 'inherit',
});
serve.on('exit', (code) => process.exit(code ?? 0));

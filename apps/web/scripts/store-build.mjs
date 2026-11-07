/**
 * Store build entry point: `pnpm --filter @amoji/web build:app`.
 *
 * Sets AMOJI_APP=1 for the Next build (static export + store bundle), then runs
 * the post-build gate. Keeping the env mutation inside this process is what
 * makes `AMOJI_APP=1` a single portable switch -- `FOO=1 pnpm build` does not
 * work in PowerShell, which is the primary shell on this project.
 *
 * `pnpm build` (web / GitHub Pages) is untouched in behaviour: its prebuild
 * clears the dev mirrors and its postbuild restores them into out/.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_BIN = path.join(WEB_ROOT, "node_modules", "next", "dist", "bin", "next");
const BUNDLE_BIN = path.join(WEB_ROOT, "scripts", "store-bundle.mjs");

// Called directly (not via `pnpm build`), so the `prebuild` lifecycle hook does
// not fire. Clear the `pnpm dev` mirrors explicitly: the bytes must never reach
// out/ in the first place, and the postbuild gate is only a backstop.
const clean = spawnSync(process.execPath, [BUNDLE_BIN, "clean-mirrors"], {
  cwd: WEB_ROOT,
  stdio: "inherit",
});
if (clean.status !== 0) process.exit(clean.status ?? 1);

const build = spawnSync(process.execPath, [NEXT_BIN, "build", "--webpack"], {
  cwd: WEB_ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    AMOJI_APP: "1",
    // A store bundle is always a static export; a server build cannot ship.
    AMOJI_EXPORT: "1",
  },
});

if (build.status !== 0) process.exit(build.status ?? 1);

const gate = spawnSync(process.execPath, [BUNDLE_BIN, "postbuild"], {
  cwd: WEB_ROOT,
  stdio: "inherit",
  env: { ...process.env, AMOJI_APP: "1", AMOJI_EXPORT: "1" },
});

process.exit(gate.status ?? 1);

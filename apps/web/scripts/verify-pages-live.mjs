/**
 * Compare repo APP_REVISION to live GitHub Pages revision.txt.
 * Usage: node scripts/verify-pages-live.mjs
 *        AMOJI_PAGES_URL=https://example.test/amoji-app node scripts/verify-pages-live.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const revTs = fs.readFileSync(path.join(WEB_ROOT, "lib/revision.ts"), "utf8");
const m = revTs.match(/export const APP_REVISION = '([^']+)'/);
if (!m) {
  console.error("[verify-pages-live] APP_REVISION not found");
  process.exit(1);
}
const expected = m[1];
const base = (process.env.AMOJI_PAGES_URL ?? "https://monmonmars.github.io/amoji-app").replace(/\/$/, "");
const url = `${base}/revision.txt`;

const res = await fetch(url, { cache: "no-store" });
if (!res.ok) {
  console.error(`[verify-pages-live] ${url} → HTTP ${res.status}`);
  process.exit(1);
}
const live = (await res.text()).trim();
if (live !== expected) {
  console.error(`[verify-pages-live] mismatch: repo ${expected} vs live ${live} (${url})`);
  process.exit(1);
}
console.log(`[verify-pages-live] OK ${live} @ ${base}`);
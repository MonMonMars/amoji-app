/**
 * Emit public/revision.txt from lib/revision.ts so live Pages can expose the
 * shipped stamp outside the precached JS bundle (stale-chunk detection).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const revTs = path.join(WEB_ROOT, "lib/revision.ts");
const out = path.join(WEB_ROOT, "public/revision.txt");

const src = fs.readFileSync(revTs, "utf8");
const m = src.match(/export const APP_REVISION = '([^']+)'/);
if (!m) {
  console.error("[write-revision-txt] APP_REVISION not found in revision.ts");
  process.exit(1);
}
fs.writeFileSync(out, `${m[1]}\n`);
console.log(`[write-revision-txt] wrote ${m[1]}`);
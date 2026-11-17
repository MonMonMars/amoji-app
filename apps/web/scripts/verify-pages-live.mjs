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

async function fetchOk(path, { expectText } = {}) {
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) {
    console.error(`[verify-pages-live] ${base}${path} → HTTP ${res.status}`);
    process.exit(1);
  }
  if (expectText) {
    const body = await res.text();
    if (!body.includes(expectText)) {
      console.error(`[verify-pages-live] ${base}${path} missing expected marker: ${expectText}`);
      process.exit(1);
    }
    if (body.includes("This page could not be found")) {
      console.error(`[verify-pages-live] ${base}${path} looks like Next 404 shell, not static docs HTML`);
      process.exit(1);
    }
  }
}

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
await fetchOk("/docs/owner-resources.html", { expectText: "Owner resource library" });
const ownerHtml = await (await fetch(`${base}/docs/owner-resources.html`, { cache: "no-store" })).text();
if (ownerHtml.includes("amoji-public-serve/")) {
  console.error("[verify-pages-live] owner-resources.html still has amoji-public-serve/ on live Pages");
  process.exit(1);
}
const sampleAudio = `${base}/audio/dance/dance-silent-dance-floor.mp3`;
const sampleVoice = `${base}/voice-clips/cma-reaction/CMA00354_universal_female_ouch_smile.mp3`;
for (const url of [sampleAudio, sampleVoice]) {
  const head = await fetch(url, { method: "HEAD", cache: "no-store" });
  if (!head.ok) {
    console.error(`[verify-pages-live] owner-resources asset ${url} → HTTP ${head.status}`);
    process.exit(1);
  }
}
console.log(`[verify-pages-live] OK ${live} @ ${base} (owner-resources.html + sample audio 200)`);
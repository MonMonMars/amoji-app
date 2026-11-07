import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEV_PAGES = ["catalog.html", "decisions.html", "gallery.html", "voice-debug.html"];

/** Adult-content tokens. `hentai` is the one that gets a build rejected. */
export const BANNED_TOKENS = ["hentai", "nsfw", "lolicon", "shotacon", "porn"];

/** Age-rating badges. Quoted/render forms only; bare `18+` is minified math. */
export const RATING_PATTERNS = [/'18\+'/, /"18\+"/, />\s*18\+\s*</, /['"]r-?18['"]/i];

const TEXT = /\.(html?|js|mjs|cjs|css|json|map|webmanifest|svg|txt|md|xml|csv|gltf)$/i;

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.isFile()) acc.push(p);
  }
  return acc;
}

export function scan(outDir) {
  if (!fs.existsSync(outDir)) throw new Error(`no such directory: ${outDir}`);
  const files = walk(outDir);
  const textFiles = files.filter((f) => TEXT.test(f));
  const findings = [];

  for (const file of files) {
    for (const name of DEV_PAGES) {
      if (path.basename(file) === name) findings.push({ kind: "qa-page", file: path.relative(outDir, file) });
    }
  }

  let bytes = 0;
  for (const file of textFiles) {
    const text = fs.readFileSync(file, "utf8");
    bytes += Buffer.byteLength(text);
    const rel = path.relative(outDir, file);
    for (const token of BANNED_TOKENS) {
      const count = text.toLowerCase().split(token).length - 1;
      if (count > 0) findings.push({ kind: "adult-token", file: rel, detail: `${count} x "${token}"` });
    }
    for (const re of RATING_PATTERNS) {
      const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
      const matches = text.match(new RegExp(re.source, flags));
      if (matches) findings.push({ kind: "age-badge", file: rel, detail: `${matches.length} x ${re}` });
    }
  }

  console.log(
    `[store-gate] ${outDir}: ${textFiles.length}/${files.length} text files ` +
      `(${(bytes / (1024 * 1024)).toFixed(1)} MB scanned)`
  );
  return findings;
}

function main() {
  const outDir = process.argv[2];
  const storeMode = process.argv.includes("--store");
  if (!outDir) {
    console.error("usage: check-store-bundle.mjs <out-dir> [--store]");
    process.exit(1);
  }

  const findings = scan(path.resolve(outDir));

  // Store bundle: everything is blocking, including the QA pages.
  // Web build (GitHub Pages): the QA pages are intentionally served there, so
  // they are not findings; content tokens anywhere ELSE still block, so a stray
  // adult string can never hide in a chunk that both builds ship.
  const isQaPage = (file) => DEV_PAGES.includes(path.basename(file));
  const blocking = storeMode
    ? findings
    : findings.filter((f) => f.kind !== "qa-page" && !isQaPage(f.file));

  if (blocking.length > 0) {
    console.error(`\n[store-gate] FAIL (${storeMode ? "store" : "web"} mode):`);
    for (const f of blocking) console.error(`  ${f.kind}: ${f.file}${f.detail ? ` - ${f.detail}` : ""}`);
    console.error("\ndocs/ASSETS.md: adult-tagged content is out entirely - instant store rejection.\n");
    process.exit(1);
  }

  const allowed = findings.filter((f) => !blocking.includes(f));
  if (allowed.length > 0) {
    console.warn("[store-gate] allowed for the GitHub Pages build (QA pages):");
    for (const f of allowed) console.warn(`  ${f.kind}: ${f.file}${f.detail ? ` - ${f.detail}` : ""}`);
  }
  console.log(`[store-gate] PASS (${storeMode ? "store" : "web"} mode)`);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry && entry === fileURLToPath(import.meta.url)) main();

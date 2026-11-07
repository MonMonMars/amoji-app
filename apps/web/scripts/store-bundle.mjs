/**
 * Store-bundle hygiene for the static export in apps/web/out.
 *
 * Why this file exists
 * --------------------
 * `next build` with `output: "export"` copies `public/` into `out/` verbatim
 * (next/dist/export/index.js: `recursiveCopy(publicDir, outDir)`). Next exposes
 * no `publicDir` / exclusion option, and a rewrite only hides a route -- the
 * bytes stay in the bundle. App Store review reads the bundle, not the routes.
 *
 * So the QA / internal pages live in `apps/web/dev-pages/` (outside `public/`),
 * which makes it structurally impossible for any build to ship them. This
 * script re-attaches them where they are legitimately wanted:
 *
 *   AMOJI_APP=1 (store build)   out/ gets none of them, then the whole tree is
 *                               scanned and the build FAILS on an
 *                               adult-content token.
 *   web build (GitHub Pages)    out/ gets them copied back, so
 *                               /amoji-app/catalog.html etc. keep working.
 *
 * Usage:
 *   node scripts/store-bundle.mjs dev-sync       (predev)   mirror into public/
 *   node scripts/store-bundle.mjs clean-mirrors             (prebuild) undo that
 *   node scripts/store-bundle.mjs postbuild                 after next build
 *   node scripts/store-bundle.mjs verify                    scan an existing out/
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV_PAGES_DIR = path.join(WEB_ROOT, "dev-pages");
const PUBLIC_DIR = path.join(WEB_ROOT, "public");
const OUT_DIR = path.join(WEB_ROOT, "out");

/**
 * Records which mode produced out/, so the vitest suite can assert the right
 * invariant without re-deriving it. Lives under .next/ (gitignored, wiped by a
 * rebuild) rather than inside out/, where it would itself ship.
 */
export const BUILD_MODE_FILE = path.join(WEB_ROOT, ".next", "amoji-build-mode.json");

/** Internal QA / research pages. Never part of a shipped bundle. */
export const DEV_PAGES = ["catalog.html", "decisions.html", "gallery.html", "voice-debug.html"];

/**
 * Tokens that may never appear in a shipped bundle. `hentai` is the hard gate:
 * an adult-content hit is an instant, hard-to-appeal store rejection. The rest
 * are cheap extra coverage that currently scan clean everywhere.
 *
 * These are matched as *text* -- the same case-insensitive substring rule people
 * apply with grep. See `isTextual` for why the rule does not apply to binary
 * asset payloads.
 */
export const BANNED_TOKENS = ["hentai", "nsfw", "lolicon", "shotacon", "porn"];

/**
 * Age-rating badges, as they appear in the QA catalog (`'18+'` in a data row).
 *
 * Deliberately NOT a bare `18+` substring: minified arithmetic produces that
 * constantly (`r.vy = 18 + 30 * n()`, `Math.round(18 + 42 * t)`), so a raw
 * substring gate would either be permanently red or have to be muted. A badge
 * is a *quoted* literal, which is what a reviewer would actually read.
 */
export const RATING_PATTERNS = [
  { label: "'18+' (single-quoted badge)", re: /'18\+'/ },
  { label: '"18+" (double-quoted badge)', re: /"18\+"/ },
  { label: '>18+< (rendered badge)', re: />\s*18\+\s*</ },
  { label: "r18 / r-18 rating", re: /['"]r-?18['"]/i },
];

/**
 * Textual scan coverage: every file the browser actually parses as text.
 *
 * Binary payloads (VRM/GLB/VRMA/PNG/MP3) are excluded on purpose. A 19 MB
 * Draco-compressed VRM contains ~19M arbitrary byte triples, so any 4-letter
 * token occurs in compressed data purely by chance -- `fumiriya.vrm` spuriously
 * matches "porn" and would fail every store build. That is noise, not a
 * finding: a reviewer cannot read a string out of an entropy-coded block, and
 * an asset is vetted by its manifest row (docs/ASSETS.md), not by byte grep.
 *
 * Anything not on this list is treated as binary, so a new text format has to
 * be added deliberately rather than silently escaping the scan.
 */
export const TEXT_EXTENSIONS = [
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".map",
  ".webmanifest",
  ".svg",
  ".txt",
  ".md",
  ".xml",
  ".csv",
  ".gltf",
];

const ASCII_DECODER = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });

/**
 * Is this file something a human or reviewer can read as text?
 * Extension allowlist first; extensionless files fall back to a decode probe.
 */
export function isTextual(file, buf) {
  const ext = path.extname(file).toLowerCase();
  if (TEXT_EXTENSIONS.includes(ext)) return true;
  if (ext !== "") return false;
  try {
    ASCII_DECODER.decode(buf);
    return true;
  } catch {
    return false;
  }
}

const isStoreBuild = () => process.env.AMOJI_APP === "1";

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

/**
 * Case-insensitive substring search over a text buffer.
 *
 * Decoded as UTF-8 (not latin1) and lower-cased: minified JS, HTML and JSON are
 * UTF-8, and a byte-level latin1 fold would still match, but decoding gives
 * correct offsets and catches the same strings. `toLowerCase()` without a
 * locale folds ASCII only, which is the behaviour we want for a case-
 * insensitive rule that cannot be gamed by "HeNtAi".
 */
export function findToken(buf, token) {
  const needle = token.toLowerCase();
  const haystack = buf.toString("utf8").toLowerCase();
  const hits = [];
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return hits;
    hits.push(at);
    from = at + 1;
  }
}

/**
 * Scan a directory tree for banned tokens in textual files.
 * Returns `{ hits, files, scanned, skipped, bytes }`; `hits` is one entry per
 * (file, token).
 */
export function scanTree(dir, tokens = BANNED_TOKENS) {
  const files = listFiles(dir);
  const hits = [];
  let scanned = 0;
  let skipped = 0;
  let bytes = 0;
  for (const file of files) {
    const buf = fs.readFileSync(file);
    bytes += buf.length;
    if (!isTextual(file, buf)) {
      skipped += 1;
      continue;
    }
    scanned += 1;
    const text = buf.toString("utf8");
    for (const token of tokens) {
      const positions = findToken(buf, token);
      if (positions.length > 0) {
        hits.push({ file: path.relative(dir, file), token, count: positions.length });
      }
    }
    for (const { label, re } of RATING_PATTERNS) {
      const matches = text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"));
      if (matches) {
        hits.push({ file: path.relative(dir, file), token: label, count: matches.length });
      }
    }
  }
  return { hits, files: files.length, scanned, skipped, bytes };
}

function copyDevPages(from, to) {
  fs.mkdirSync(to, { recursive: true });
  const copied = [];
  for (const name of DEV_PAGES) {
    const src = path.join(from, name);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(to, name));
    copied.push(name);
  }
  return copied;
}

/**
 * prebuild: drop any `pnpm dev` mirror so a build never depends on, or ships,
 * whatever happened to be sitting in public/ from an interrupted dev session.
 * The web build re-adds them from dev-pages/ in postbuild; the store build must
 * not have them at all.
 */
function cleanMirrors() {
  let removed = 0;
  for (const name of DEV_PAGES) {
    const stale = path.join(PUBLIC_DIR, name);
    if (fs.existsSync(stale)) {
      fs.rmSync(stale, { force: true });
      removed += 1;
    }
  }
  console.log(`[store-bundle] prebuild: cleared ${removed} dev mirror(s) from public/`);
}

/** predev: make the QA pages reachable at http://localhost:3000/<page> again. */
function devSync() {
  const copied = copyDevPages(DEV_PAGES_DIR, PUBLIC_DIR);
  console.log(`[store-bundle] dev: mirrored ${copied.length} QA page(s) into public/`);
  for (const name of copied) console.log(`  http://localhost:3000/${name}`);
}

/**
 * Fail the build if the export tree cannot be shipped.
 *
 * Store mode does not repair the tree after the fact -- `store-build.mjs` clears
 * the dev mirrors from public/ *before* invoking Next, so the bytes never enter
 * out/. What this adds is the assertion that nothing reintroduced them, plus
 * the real invariant: zero adult tokens anywhere in the tree.
 */
function verify({ store }) {
  if (!fs.existsSync(OUT_DIR)) {
    console.error("[store-bundle] no out/ directory -- run next build first");
    process.exit(1);
  }

  const present = DEV_PAGES.filter((name) => fs.existsSync(path.join(OUT_DIR, name)));
  const problems = [];

  if (store) {
    for (const name of present) problems.push(`${name}: internal QA page present in out/`);
  } else {
    for (const name of present) {
      console.log(`[store-bundle] web build keeps ${name} (QA page, GitHub Pages only)`);
    }
  }

  const { hits, files, scanned, skipped, bytes } = scanTree(OUT_DIR);
  console.log(
    `[store-bundle] scanned ${scanned}/${files} text files ` +
      `(${skipped} binary skipped) / ${(bytes / (1024 * 1024)).toFixed(1)} MB ` +
      `for ${BANNED_TOKENS.length} token(s)`
  );

  if (hits.length > 0) {
    for (const hit of hits) {
      const detail = `${hit.file}: ${hit.count} x "${hit.token}"`;
      if (store) problems.push(detail);
      else console.warn(`[store-bundle] WARN (web build, allowed): ${detail}`);
    }
  }

  if (problems.length > 0) {
    console.error("\n[store-bundle] STORE BUILD REJECTED:");
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      "\ndocs/ASSETS.md policy: adult-tagged assets are out entirely " +
        "(instant App Store rejection).\n"
    );
    process.exit(1);
  }

  if (store) console.log("[store-bundle] store build clean: no QA pages, no adult tokens");
}

function postbuild() {
  const store = isStoreBuild();
  if (!fs.existsSync(OUT_DIR)) {
    // `next build` without AMOJI_EXPORT is a normal server build: there is no
    // export tree to inspect and nothing to strip. Not an error.
    if (store) {
      console.error("[store-bundle] store build produced no out/ -- AMOJI_APP needs output: export");
      process.exit(1);
    }
    console.log("[store-bundle] no out/ (server build) -- nothing to gate");
    return;
  }
  if (!store) {
    const copied = copyDevPages(DEV_PAGES_DIR, OUT_DIR);
    console.log(`[store-bundle] web build: restored ${copied.length} QA page(s) into out/`);
  }
  fs.mkdirSync(path.dirname(BUILD_MODE_FILE), { recursive: true });
  fs.writeFileSync(
    BUILD_MODE_FILE,
    JSON.stringify({ mode: store ? "app" : "web", at: new Date().toISOString() }, null, 2) + "\n"
  );
  verify({ store });
}

const command = process.argv[2];
const isDirectRun =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (!isDirectRun) {
  // Imported for DEV_PAGES / scanTree / findToken -- do not run the CLI.
} else if (command === "dev-sync") devSync();
else if (command === "clean-mirrors") cleanMirrors();
else if (command === "postbuild") postbuild();
else if (command === "verify") verify({ store: isStoreBuild() });
else {
  console.error("usage: store-bundle.mjs <dev-sync|clean-mirrors|postbuild|verify>");
  process.exit(1);
}

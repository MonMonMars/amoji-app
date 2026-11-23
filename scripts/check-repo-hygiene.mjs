#!/usr/bin/env node
// Repo hygiene guard for the amoji-app monorepo.
//
// Why this exists
// ---------------
// On 2026-11-23 a `git worktree remove` was run on a worktree whose
// `apps/web/node_modules` was a JUNCTION into the primary checkout. Recursive
// deletes on Windows follow junctions, so git walked:
//
//   worktree/apps/web/node_modules            (junction)
//     -> primary/apps/web/node_modules
//        -> primary/apps/web/node_modules/@amoji/emotion-core  (pnpm link, junction)
//           -> primary/packages/emotion-core                    <-- DELETED
//        -> primary/apps/web/node_modules/@amoji/vrm-renderer  (pnpm link, junction)
//           -> primary/packages/vrm-renderer                    <-- DELETED
//
// That removed all 29 tracked files of those two packages from the primary,
// plus most of the primary's node_modules. See docs/WORKTREE_SAFETY.md.
//
// What this checks
// ----------------
// 1. Every tracked path under packages/ still exists on disk. Missing files are
//    the signature of the incident above, so this is a hard failure.
// 2. Other tracked deletions are reported as a warning (an agent may be
//    mid-refactor outside packages/).
// 3. node_modules paths in this checkout that are junctions into ANOTHER
//    checkout, or dangling junctions, are reported: those are the links that
//    make the incident possible, and the same topology is what lets a
//    `pnpm install` in a worktree rewrite the primary's links.
//
// Usage
// -----
//   node scripts/check-repo-hygiene.mjs             # warn on junctions, fail on missing packages files
//   node scripts/check-repo-hygiene.mjs --strict    # also fail on junctions / non-package deletions
//   node scripts/check-repo-hygiene.mjs --allow-missing
//   node scripts/check-repo-hygiene.mjs --root <path>
//
// Exit code 0 means the checkout looks healthy.

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

const REPORT_PREFIX = "[repo-hygiene]";

function run(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).map((entry) => entry.name);
  } catch {
    return [];
  }
}

function isInside(rootReal, candidateReal) {
  const rel = path.relative(rootReal.toLowerCase(), candidateReal.toLowerCase());
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function findMissingTrackedFiles(root, prefix) {
  const tracked = run(root, ["ls-files", "-z", "--", prefix])
    .split("\u0000")
    .filter(Boolean);
  return tracked.filter((relPath) => !existsSync(path.join(root, relPath)));
}

function findTrackedDeletions(root) {
  // -uno: tracked files only. A deletion shows as " D <path>" (worktree) or
  // "D  <path>" (staged). Intentional commits are already gone from status.
  const out = run(root, ["status", "--porcelain", "-uno"]);
  return out
    .split(/\r?\n/)
    .filter((line) => line.length > 3 && line[0] === "D")
    .map((line) => line.slice(3).trim());
}

function findRiskyNodeModulesLinks(root) {
  const rootReal = realpathSync(root);
  const parents = new Set([root]);
  for (const group of ["apps", "packages"]) {
    for (const name of readdirSafe(path.join(root, group))) {
      parents.add(path.join(root, group, name));
    }
  }
  parents.add(path.join(root, "server", "backend"));

  const candidates = new Set();
  for (const parent of parents) {
    const nodeModules = path.join(parent, "node_modules");
    candidates.add(nodeModules);
    for (const name of readdirSafe(nodeModules)) {
      candidates.add(path.join(nodeModules, name));
      if (name.startsWith("@")) {
        for (const scoped of readdirSafe(path.join(nodeModules, name))) {
          candidates.add(path.join(nodeModules, name, scoped));
        }
      }
    }
  }

  const risky = [];
  const reportedRoots = [];
  // Shallowest first, so one junctioned node_modules is reported once instead
  // of every link inside it.
  for (const candidate of [...candidates].sort((a, b) => a.length - b.length)) {
    const covered = reportedRoots.some((root) =>
      candidate.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`),
    );
    if (covered) continue;

    let stat = null;
    try {
      stat = lstatSync(candidate, { throwIfNoEntry: false });
    } catch {
      stat = null;
    }
    if (!stat || !stat.isSymbolicLink()) continue;

    let target = null;
    try {
      target = realpathSync(candidate);
    } catch {
      risky.push({ link: candidate, target: null, kind: "dangling" });
      reportedRoots.push(candidate);
      continue;
    }
    if (!isInside(rootReal, target)) {
      risky.push({ link: candidate, target, kind: "external" });
      reportedRoots.push(candidate);
    }
  }
  return risky;
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const allowMissing = args.includes("--allow-missing");
  const rootIndex = args.indexOf("--root");
  const root =
    rootIndex >= 0 && args[rootIndex + 1]
      ? path.resolve(args[rootIndex + 1])
      : path.resolve(run(process.cwd(), ["rev-parse", "--show-toplevel"]).trim());

  const missingPackagesFiles = findMissingTrackedFiles(root, "packages");
  const deletedTrackedFiles = findTrackedDeletions(root).filter(
    (relPath) => !relPath.startsWith("packages/") && !relPath.startsWith("packages\\"),
  );
  const riskyLinks = findRiskyNodeModulesLinks(root);

  let failed = false;
  let warned = false;

  if (missingPackagesFiles.length > 0) {
    failed = !allowMissing;
    console.error(
      `${REPORT_PREFIX} ${failed ? "FAIL" : "WARN"}: ${missingPackagesFiles.length} tracked file(s) under packages/ are missing from disk:`,
    );
    for (const relPath of missingPackagesFiles) console.error(`  - ${relPath}`);
    console.error(
      `${REPORT_PREFIX} this is the signature of a recursive delete that followed a node_modules junction.`,
    );
    console.error(`${REPORT_PREFIX} restore with: git checkout -- packages/`);
    console.error(`${REPORT_PREFIX} never delete a worktree whose node_modules is a junction (docs/WORKTREE_SAFETY.md).`);
  }

  if (deletedTrackedFiles.length > 0) {
    warned = true;
    const level = strict ? "FAIL" : "WARN";
    if (strict) failed = true;
    console.error(`${REPORT_PREFIX} ${level}: ${deletedTrackedFiles.length} tracked file(s) outside packages/ are deleted in the working tree:`);
    for (const relPath of deletedTrackedFiles.slice(0, 20)) console.error(`  - ${relPath}`);
    if (deletedTrackedFiles.length > 20) {
      console.error(`  ... and ${deletedTrackedFiles.length - 20} more`);
    }
  }

  if (riskyLinks.length > 0) {
    warned = true;
    const level = strict ? "FAIL" : "WARN";
    if (strict) failed = true;
    console.error(`${REPORT_PREFIX} ${level}: ${riskyLinks.length} node_modules path(s) point outside this checkout or dangle:`);
    for (const { link, target, kind } of riskyLinks) {
      const shown = path.relative(root, link) || link;
      console.error(`  - ${shown} (${kind})${target ? ` -> ${target}` : ""}`);
    }
    console.error(`${REPORT_PREFIX} a junctioned node_modules is unsafe here: a recursive delete of this checkout`);
    console.error(`${REPORT_PREFIX} deletes the other checkout's files, and pnpm install rewrites its links.`);
    console.error(`${REPORT_PREFIX} safe teardown: rmdir every junction first, then git worktree remove.`);
  }

  if (!failed && !warned) {
    const trackedPackagePaths = run(root, ["ls-files", "--", "packages"]).split(/\r?\n/).filter(Boolean).length;
    console.log(`${REPORT_PREFIX} ok: ${trackedPackagePaths} tracked package paths present, no risky node_modules junctions`);
  }

  process.exit(failed ? 1 : 0);
}

main();

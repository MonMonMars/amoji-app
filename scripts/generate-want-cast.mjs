#!/usr/bin/env node
/** Generate apps/web/lib/characters-want.ts from apps/web/lib/want-roster.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rosterPath = path.join(root, 'apps/web/lib/want-roster.json');
const outPath = path.join(root, 'apps/web/lib/characters-want.ts');
const castNoPath = path.join(root, 'apps/web/lib/castNo.ts');

const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));

/**
 * The badge number a character already shipped with. Removing a character must
 * not renumber the rest — users see these numbers on the select fan, and cached
 * thumbs are keyed by them. Numbers 4 and 5 stay retired with a04/a05.
 */
const SHIPPED_CAST_NO = {
  'a01-shino': 1, 'a02-shibu': 2, 'a03-fumiriya': 3, 'a04-avatarsample-a': 4, 'a05-avatarsample-c': 5,
  'a10-agahomei-normal': 6, 'a14-vivi': 7, 'a16-vita': 8, 'a17-victoria-rubin': 9,
  'a23-hairsample-female': 10, 'a24-hairsample-male': 11, 'a61-saori-kamiya-llunne': 12,
  'a63-hinoame-satuki-mei-sirayuki': 13, 'a64-lily-lily-animeit': 14, 'a70-vtuber-aihina-sample': 15,
  'a71-mary-sweety': 16, 'a74-mizuka': 17, 'a75-sorano': 18, 'a77-sasha': 19,
  'a79-amami-karasu': 20, 'a81-cinna': 21, 'a82-renel-bonnie': 22, 'a83-ao-witch': 23,
  'a85-kara': 24, 'a89-rurina': 25, 'a93-edokko': 26, 'a94-rita': 27, 'a95-mizu': 28,
  'a96-pee-aruako': 29, 'a97-pee-saaya': 30, 'a98-ethan': 31, 'a99-miyora': 32,
  'a103-rockredgradientjk': 33, 'a104-simplebrownsailorjk': 34, 'a105-serizawa-aoi': 35,
  'a106-auroragradhairjk': 36, 'a107-dm-office-casual': 37, 'a109-riona': 38,
  'a112-mahochan-jk': 39, 'a114-sailor-cardigan-girl': 40, 'a116-haru-uniform': 41,
  'a117-erigawa-risa': 42, 'a119-kanami-uniform': 43, 'a120-morikawa-yuki-summer-uniform': 44,
  'a121-nagano-mami-uniform': 45, 'a122-shiratori-hikari-shifuku': 46,
};

/** Removed from the roster but their numbers stay reserved. */
const RETIRED_CAST_NO = [['a04-avatarsample-a', 4], ['a05-avatarsample-c', 5]];

function castNoOf(id) {
  const n = SHIPPED_CAST_NO[id];
  if (!n) throw new Error(`no shipped castNo for ${id} — add it to SHIPPED_CAST_NO`);
  return n;
}

const FLAVORS = ['cheerful', 'playful', 'gentle', 'cool'];
const POKE_TWISTS = ['playful', 'playful', 'gentle', 'flustered'];
const POKE_FACES = ['happy', 'surprised', 'happy', 'surprised'];

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function taglineEn(name) {
  const n = name.replace(/\s+/g, ' ').trim();
  const variants = [
    `${n} — warm friend, always listening`,
    `${n} — gentle heart, steady cheer`,
    `${n} — sunny companion, kind voice`,
    `${n} — calm buddy, curious and caring`,
  ];
  return variants[name.length % variants.length];
}

function taglineYue(name) {
  return `${name}——陪你傾偈嘅小伙伴~`;
}

function taglineZh(name) {
  return `${name}——陪你聊天的小伙伴~`;
}

function taglineJa(name) {
  return `${name}——一緒にお話しする相棒~`;
}

function persona(name, gender, i) {
  const tone =
    gender === 'male'
      ? 'You speak calmly and supportively, with dry humor kept wholesome.'
      : 'You speak warmly and expressively, with sincere encouragement and gentle humor.';
  const hooks = [
    'You love little daily joys and ask thoughtful follow-up questions.',
    'You notice how the user feels and respond with patience and light cheer.',
    'You stay curious, optimistic, and never talk down to anyone.',
    'You keep things cozy, kid-safe, and full of friendly energy.',
  ];
  return `You are ${name}: a wholesome, kid-friendly companion. ${tone} ${hooks[i % hooks.length]}`;
}

const lines = [];
lines.push("'use client';");
lines.push('// AUTO-GENERATED from want-roster.json — run: node scripts/generate-want-cast.mjs');
lines.push(`// releaseTag: ${roster.releaseTag}`);
lines.push('//');
lines.push('// `castNo` is the STABLE select-page badge, not the array index. Two entries');
lines.push('// (a04, a05) were removed for licensing, so numbering skips those two');
lines.push('// numbers on purpose — renumbering would change the badge on every later');
lines.push('// card and mismatch any cached thumb keyed by number.');
lines.push('//');
lines.push('// FROZEN: a14-vivi / a16-vita / a17-victoria-rubin are CC0 only because they');
lines.push('// are β-era VRoid Studio exports. v0.14.0 disabled CC0 export for the renamed');
lines.push('// samples (AvatarSample_E/F/G), so re-exporting any of them would lose the');
lines.push('// CC0 declaration permanently. Do not re-export or "repair" those three.');
lines.push('');
lines.push('export const WANT_CAST_RELEASE = ' + JSON.stringify(roster.releaseTag) + ';');
lines.push('');
lines.push('/** β-era CC0 exports — never re-export, the CC0 declaration cannot be restored. */');
lines.push('export const FROZEN_CC0_IDS: readonly string[] = [');
lines.push("  'a14-vivi',");
lines.push("  'a16-vita',");
lines.push("  'a17-victoria-rubin',");
lines.push('];');
lines.push('');
lines.push('export const CHARACTERS_WANT = [');

roster.characters.forEach((c, i) => {
  const tl = taglineEn(c.name);
  lines.push('  {');
  lines.push(`    id: '${c.id}',`);
  lines.push(`    name: '${esc(c.name)}',`);
  lines.push(`    gender: '${c.gender}',`);
  lines.push(`    accent: '${c.accent}',`);
  lines.push(`    kidSafe: ${c.kidSafe !== false},`);
  lines.push(`    image: '${c.imageUrl}',`);
  lines.push(`    model: 'want/${c.modelFile}',`);
  lines.push(`    voiceHint: { yue: '${c.voiceHint.yue}', en: '${c.voiceHint.en}' },`);
  lines.push('    tagline: {');
  lines.push(`      en: '${esc(tl)}',`);
  lines.push(`      yue: '${esc(taglineYue(c.name))}',`);
  lines.push(`      zh: '${esc(taglineZh(c.name))}',`);
  lines.push(`      ja: '${esc(taglineJa(c.name))}',`);
  lines.push('    },');
  lines.push(`    persona: '${esc(persona(c.name, c.gender, i))}',`);
  lines.push('  },');
});

lines.push('];');
lines.push('');
lines.push('export const WANT_CAST_IDS: string[] = CHARACTERS_WANT.map((c) => c.id);');
lines.push('');

fs.writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath} (${roster.characters.length} characters)`);

const castNoLines = [
  "'use client';",
  '// AUTO-GENERATED from want-roster.json — keep in sync with CHARACTERS order in prefs.ts',
  `// releaseTag: ${roster.releaseTag}`,
  '//',
  '// Badge numbers are STABLE and deliberately not renumbered: a04 (4) and a05 (5)',
  '// were removed for licensing, so those two numbers are retired. Everything after',
  '// them keeps the number it already shipped with. Retired ids still resolve, so a',
  '// saved prefs/localStorage value cannot come back as "unknown character".',
  'export const CAST_NO = {',
  ...roster.characters.map((c) => `  '${c.id}': ${castNoOf(c.id)},`),
  // Retired ids keep their number so a stale pick is identifiable, never 0.
  ...RETIRED_CAST_NO.map(([id, n]) => `  '${id}': ${n}, // retired — removed for licensing`),
  '} as const;',
  '',
  '/** Ids that shipped before the 2026-11-08 licensing purge. `prefs` migrates them. */',
  `export const RETIRED_CAST_IDS: readonly string[] = [${RETIRED_CAST_NO.map(([id]) => `'${id}'`).join(', ')}];`,
  '',
  'export type CastId = keyof typeof CAST_NO;',
  '',
  '/** stable number for a character id — 0 means unknown (never shipped) */',
  'export function castNo(id: string): number {',
  '  return (CAST_NO as Record<string, number>)[id] ?? 0;',
  '}',
  '',
];
fs.writeFileSync(castNoPath, castNoLines.join('\n'));
console.log(`Wrote ${castNoPath}`);

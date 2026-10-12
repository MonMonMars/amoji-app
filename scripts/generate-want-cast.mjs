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
lines.push('');
lines.push('export const WANT_CAST_RELEASE = ' + JSON.stringify(roster.releaseTag) + ';');
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
  lines.push(`    model: '${c.modelUrl}',`);
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
  'export const CAST_NO = {',
  ...roster.characters.map((c, i) => `  '${c.id}': ${i + 1},`),
  '} as const;',
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

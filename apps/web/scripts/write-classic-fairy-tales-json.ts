import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASSIC_FAIRY_TALES } from '../lib/classic-fairy-tales';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(webRoot, '../..');

const payload = {
  version: 2,
  license:
    'Public-domain classic plots; spoken emotional retellings for amoji demo Story chip. Not modern copyrighted retellings.',
  attribution:
    'Brothers Grimm, Hans Christian Andersen, Charles Perrault, Aesop, Arabian Nights, Chinese/Japanese folk (Project Gutenberg et al.)',
  tales: CLASSIC_FAIRY_TALES.map(
    ({ ownerCode, id, slug, length, author, credit, sourceUrl, title, text }) => ({
      ownerCode,
      id,
      slug,
      length,
      author,
      credit,
      sourceUrl,
      title,
      text,
    }),
  ),
};

const targets = [
  path.join(webRoot, 'public/stories/classic-fairy-tales.json'),
  path.join(root, 'docs/amoji-public-serve/stories/classic-fairy-tales.json'),
];

for (const out of targets) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log('wrote', out, 'tales:', payload.tales.length);
}
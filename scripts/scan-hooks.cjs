// Scan persona-chatter.ts for idle/poke lines that violate the hook-ending rule.
const fs = require('fs');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const idleStart = src.indexOf('CHARACTER_IDLE');
const pokeStart = src.indexOf('CHARACTER_POKE');
const IDLE_HOOK = /[?？~〜]$/;
const POKE_HOOK = /[?？!！~〜…]$/;
const lines = src.split('\n');
let bad = 0;
lines.forEach((ln, i) => {
  const abs = lines.slice(0, i).join('\n').length;
  const m = ln.match(/^\s*(en|yue|zh|ja)\s*:\s*\[(.*)\],?\s*$/);
  if (!m) return;
  const isIdle = abs < pokeStart;
  const hook = isIdle ? IDLE_HOOK : POKE_HOOK;
  const kind = isIdle ? 'IDLE' : 'POKE';
  const re = /'((?:[^'\\]|\\.)*)'/g;
  let s;
  while ((s = re.exec(m[2]))) {
    const line = s[1].trim();
    if (!hook.test(line)) {
      bad++;
      console.log(`${kind} L${i + 1} ${m[1]}: ${line}`);
    }
  }
});
console.log(bad === 0 ? 'ALL HOOKED' : `${bad} violations`);

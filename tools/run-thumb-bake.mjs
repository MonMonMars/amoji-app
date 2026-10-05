// r114 dev tool: drives the Kimi browser extension (local gateway) to open
// the /thumb-bake page in the dev server and waits until every cast member's
// JPEG is baked and saved. Usage: node tools/run-thumb-bake.mjs
const GW = 'http://127.0.0.1:10086/command';
const BAKE_URL = 'http://localhost:3000/thumb-bake';
const DEADLINE = Date.now() + 15 * 60 * 1000;

async function call(payload) {
  const r = await fetch(GW, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.json();
}

let session;
async function withSession(payload) {
  let res = await call({ ...payload, session });
  const msg = String(res?.error?.message ?? '');
  if (res?.ok === false && /session/i.test(msg)) {
    const tabs = await call({ action: 'list_tabs' });
    const s = tabs?.ok ?? tabs;
    session = s?.sessions?.[0] ?? s?.tabs?.[0]?.session ?? s?.[0];
    res = await call({ ...payload, session });
  }
  return res;
}

const nav = await withSession({ action: 'navigate', url: BAKE_URL, newTab: true });
console.log('navigate →', JSON.stringify(nav).slice(0, 300));

let last = '';
while (Date.now() < DEADLINE) {
  await new Promise((r) => setTimeout(r, 5000));
  const st = await withSession({
    action: 'evaluate',
    expression:
      'window.__bakeDone ? "BAKE_DONE " + JSON.stringify(window.__bakeDone) : String(window.__bakeProgress || "starting…")',
  });
  const txt = JSON.stringify(st?.ok ?? st).slice(0, 600);
  if (txt !== last) { console.log(txt); last = txt; }
  if (txt.includes('BAKE_DONE')) { console.log('ALL DONE'); process.exit(0); }
}
console.log('TIMEOUT waiting for bake');
process.exit(2);

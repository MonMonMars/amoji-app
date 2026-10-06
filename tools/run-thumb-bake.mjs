// r114 dev tool: drives the Kimi browser extension (local gateway) to open
// the /thumb-bake page in the dev server and waits until every cast member's
// JPEG + cutout PNG is baked and saved. Usage: node tools/run-thumb-bake.mjs
// r123: the gateway speaks `code` (not `expression`); evaluate takes the
// tabId from navigate (or no session = active tab) and returns
// {data:{type,value}} — poll data.value.
const GW = 'http://127.0.0.1:10086/command';
const BAKE_URL = 'http://localhost:3000/thumb-bake';
const DEADLINE = Date.now() + 20 * 60 * 1000;

async function call(payload) {
  const r = await fetch(GW, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.json();
}

const nav = await call({ action: 'navigate', url: BAKE_URL, newTab: true });
const tabId = nav?.data?.tabId ?? null;
console.log('navigate →', JSON.stringify(nav).slice(0, 300));

let last = '';
while (Date.now() < DEADLINE) {
  await new Promise((r) => setTimeout(r, 5000));
  const st = await call({
    action: 'evaluate',
    ...(tabId ? { tabId } : {}),
    code:
      'window.__bakeDone ? "BAKE_DONE " + JSON.stringify(window.__bakeDone) : String(window.__bakeProgress || "starting…")',
  });
  const txt = String(st?.data?.value ?? JSON.stringify(st)).slice(0, 600);
  if (txt !== last) { console.log(txt); last = txt; }
  if (txt.includes('BAKE_DONE')) { console.log('ALL DONE'); process.exit(0); }
}
console.log('TIMEOUT waiting for bake');
process.exit(2);

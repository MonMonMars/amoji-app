// r114 dev tool: poll the bake page's progress inside the webbridge tab.
// Usage: node tools/poll-bake.mjs [tabId] [minutes]
const GW = 'http://127.0.0.1:10086/command';
const tabId = Number(process.argv[2] || 0) || undefined;
const mins = Number(process.argv[3] || 4);
const end = Date.now() + mins * 60 * 1000;

async function ev(expression) {
  const r = await fetch(GW, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'evaluate', tabId, code: expression }),
  });
  return r.json();
}

let last = '';
while (Date.now() < end) {
  const j = await ev(
    'window.__bakeDone ? "BAKE_DONE " + JSON.stringify(window.__bakeDone) : String(window.__bakeProgress || "starting…")',
  );
  const t = typeof j?.data?.value === 'string' ? j.data.value : JSON.stringify(j).slice(0, 300);
  if (t !== last) { console.log(t); last = t; }
  if (t.includes('BAKE_DONE')) process.exit(0);
  await new Promise((r) => setTimeout(r, 8000));
}
console.log('POLL_WINDOW_ENDED');
process.exit(3);

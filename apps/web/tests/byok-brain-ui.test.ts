// r2026-11-08 ??the Brain (BYOK) section is reachable again, and it behaves.
//
// Four properties are asserted here, in the order they matter to a user:
//   1. The section RENDERS when Settings opens ??the whole defect was that no
//      user could ever reach a key field.
//   2. A key persists to, and is read back from, the exact localStorage slot
//      brain.ts uses (`amoji.brain.key.<id>`). A guessed slot name would make
//      the UI look like it saved while the chat never saw the key.
//   3. The Test button SURFACES a failure ??cause in words plus the provider's
//      own reply ??instead of swallowing it.
//   4. No key value reaches the DOM (or any log) after saving.
//
// react-dom/server is used because this repo ships no DOM environment, and a
// server render of a real component is a stronger claim than grepping source.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// SettingsSheet's identity card links to /change via the app router, which is
// not mounted in a node test.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {}, prefetch: () => {} }),
}));

import SettingsSheet from '../components/SettingsSheet';
import { BrainVerdict, VERDICT_KEY } from '../components/BrainByok';
import {
  BRAIN_SPECS, brainKey, brainKeyStorageKey, probeBrain, saveBrainKey, setBrainKey,
  setBrainProvider, type BrainId,
} from '../lib/brain';
import { LANGS, STRINGS, t } from '../lib/prefs';

const PREFS = {
  character: 'a01-shino', background: 'void', lang: 'en' as const,
  kidMode: false, sfxVol: 80 as const, bgmVol: 80 as const, voiceVol: 80 as const,
};

const renderSheet = () => renderToStaticMarkup(createElement(SettingsSheet, {
  open: true, prefs: PREFS, onChange: () => {}, onClose: () => {}, memCount: 0, onForget: () => {},
}));

/** Minimal localStorage stand-in. */
function swapLs(seed: Record<string, string> = {}): () => void {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map(Object.entries(seed));
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  } as Storage;
  return () => {
    if (prev === undefined) delete g.localStorage;
    else g.localStorage = prev;
  };
}

// ---------------------------------------------------------------------------
// 1. The section renders when Settings is opened
// ---------------------------------------------------------------------------

describe('Brain section renders when Settings opens', () => {
  let restore: () => void;
  beforeEach(() => { restore = swapLs(); });

  it('shows the section, a provider picker and a key field', () => {
    const html = renderSheet();
    expect(html).toContain(t('en', 'byokTitle'));
    expect(html).toContain('id="amoji-settings-byok-provider"');
    // The key field must be present on FIRST paint, not behind a second click:
    // hiding it is the discoverability bug this change exists to fix.
    expect(html).toContain('id="amoji-settings-byok-key"');
    expect(html).toContain('type="password"');
    expect(html).toContain('name="brain-api-key"');
    restore();
  });

  it('offers every provider brain.ts actually implements, plus Automatic', () => {
    const html = renderSheet();
    expect(html).toContain('>Automatic');
    for (const spec of BRAIN_SPECS) expect(html, spec.id).toContain(spec.label);
    restore();
  });

  it('says the key stays on this device, and that no key is required', () => {
    const html = renderSheet();
    expect(html).toContain(t('en', 'byokLocalOnly'));
    expect(html).toContain(t('en', 'byokWorksWithout'));
    restore();
  });

  it('links the active provider to the page that actually issues its keys', () => {
    const html = renderSheet();
    // Only the active provider is expanded, so its key page is the one linked.
    const active = BRAIN_SPECS.find((s) => s.id === 'deepseek')!;
    expect(html).toContain(`href="${active.keyUrl}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    restore();
  });

  it('every keyed provider has a real https key page, and the free lane needs none', () => {
    for (const spec of BRAIN_SPECS) {
      if (spec.keyless) {
        expect(spec.keyUrl, `${spec.id} is keyless`).toBe('');
        continue;
      }
      expect(spec.keyUrl.startsWith('https://'), `${spec.id} key page`).toBe(true);
      expect(spec.keyFrom.length, `${spec.id} short host`).toBeGreaterThan(0);
    }
    restore();
  });

  it('states a free-tier allowance for every provider', () => {
    const html = renderSheet();
    // Automatic resolves to a keyed provider, so its allowance line is shown.
    expect(html).toContain(t('en', 'byokTierDeepseek'));
    for (const { id } of LANGS) {
      for (const key of ['byokTierDeepseek', 'byokTierMoonshot', 'byokTierGroq', 'byokTierOpenrouter', 'byokTierPollinations'] as const) {
        expect(STRINGS[key][id], `${key}.${id}`).toBeTruthy();
      }
    }
    restore();
  });
});

// ---------------------------------------------------------------------------
// 2. Persistence: the exact slot, in both directions
// ---------------------------------------------------------------------------

describe('key persistence uses the slot brain.ts reads', () => {
  let restore: () => void;
  beforeEach(() => { restore = swapLs(); });

  it('writes to amoji.brain.key.<id> and reads back through brainKey', () => {
    expect(saveBrainKey('groq', '  gsk-abc123  ')).toBe(true);
    const g = globalThis as { localStorage?: Storage };
    expect(g.localStorage!.getItem('amoji.brain.key.groq')).toBe('gsk-abc123');
    expect(brainKey('groq')).toBe('gsk-abc123');
    restore();
  });

  it('every provider id maps to a distinct slot', () => {
    const slots = BRAIN_SPECS.map((s) => brainKeyStorageKey(s.id));
    expect(new Set(slots).size).toBe(slots.length);
    for (const s of BRAIN_SPECS) expect(slots).toContain(`amoji.brain.key.${s.id}`);
  });

  it('a blank save never wipes a key that is already stored', () => {
    setBrainKey('deepseek', 'sk-good');
    expect(saveBrainKey('deepseek', '   ')).toBe(false);
    expect(brainKey('deepseek')).toBe('sk-good');
    restore();
  });

  it('the stored key is never rendered back into the page', () => {
    setBrainKey('deepseek', 'sk-super-secret-value');
    setBrainProvider('deepseek');
    const html = renderSheet();
    // The provider is remembered...
    expect(html).toContain('value="deepseek"');
    // ...but the secret is nowhere in the markup, and the field starts empty.
    expect(html).not.toContain('sk-super-secret-value');
    restore();
  });

  it('a saved key on Automatic is picked up by auto routing', async () => {
    const { pickBrain } = await import('../lib/brain');
    saveBrainKey('moonshot', 'sk-auto');
    expect(pickBrain().spec.id).toBe('moonshot');
    expect(pickBrain().key).toBe('sk-auto');
    restore();
  });
});

// ---------------------------------------------------------------------------
// 3. Test button: a failure is surfaced, with the provider's own words
// ---------------------------------------------------------------------------

describe('Test button surfaces failures instead of swallowing them', () => {
  let restore: () => void;
  beforeEach(() => { restore = swapLs(); });

  const renderVerdict = (result: Parameters<typeof BrainVerdict>[0]['result']) =>
    renderToStaticMarkup(createElement(BrainVerdict, { lang: 'en', result }));

  it('turns a 401 into a named auth failure plus the provider body', async () => {
    const r = await probeBrain('deepseek', {
      key: 'sk-bad',
      fetchImpl: (async () => new Response(
        JSON.stringify({ error: { message: 'Authentication Fails, Your api key is invalid' } }),
        { status: 401 },
      )) as unknown as typeof fetch,
    });
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe('auth');
    expect(r.detail).toContain('api key is invalid');

    const html = renderVerdict(r);
    expect(html).toContain(t('en', 'byokTestAuth'));
    expect(html).toContain('api key is invalid'); // the actual error, on screen
    expect(html).toContain('data-verdict="auth"');
    restore();
  });

  it('separates a region/network refusal from a bad key', async () => {
    // Verified live: api.groq.com answers a bare 403 with an empty body from a
    // Hong Kong network, for any endpoint, before the key is looked at.
    const blocked = await probeBrain('groq', {
      key: 'gsk-whatever',
      fetchImpl: (async () => new Response('', { status: 403 })) as unknown as typeof fetch,
    });
    expect(blocked.verdict).toBe('blocked');
    expect(renderVerdict(blocked)).toContain(t('en', 'byokTestBlocked'));

    const badKey = await probeBrain('groq', {
      key: 'gsk-whatever',
      fetchImpl: (async () => new Response(
        JSON.stringify({ error: { message: 'Invalid API Key' } }), { status: 403 },
      )) as unknown as typeof fetch,
    });
    expect(badKey.verdict).toBe('auth');
    restore();
  });

  it('reports a retired model id as a model problem, not a key problem', async () => {
    const r = await probeBrain('groq', {
      key: 'gsk-ok',
      fetchImpl: (async () => new Response(
        JSON.stringify({ error: { message: 'The model `llama-3.3-70b-versatile` does not exist' } }),
        { status: 404 },
      )) as unknown as typeof fetch,
    });
    expect(r.verdict).toBe('model');
    expect(renderVerdict(r)).toContain(t('en', 'byokTestModel'));
    restore();
  });

  it('reports timeout and network failure distinctly', async () => {
    const timeout = await probeBrain('deepseek', {
      key: 'sk-ok',
      timeoutMs: 5,
      fetchImpl: ((_u: string, init?: RequestInit) => new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          rej(e);
        });
      })) as unknown as typeof fetch,
    });
    expect(timeout.verdict).toBe('timeout');
    expect(renderVerdict(timeout)).toContain(t('en', 'byokTestTimeout'));

    const offline = await probeBrain('deepseek', {
      key: 'sk-ok',
      fetchImpl: (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch,
    });
    expect(offline.verdict).toBe('offline');
    expect(renderVerdict(offline)).toContain(t('en', 'byokTestOffline'));
    restore();
  });

  it('an out-of-credit 200 body still fails the probe', async () => {
    const r = await probeBrain('openrouter', {
      key: 'sk-ok',
      fetchImpl: (async () => new Response(
        'insufficient credit balance for this account', { status: 200 },
      )) as unknown as typeof fetch,
    });
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe('credit');
    restore();
  });

  it('a real 200 pass says the key works', async () => {
    const r = await probeBrain('groq', {
      key: 'gsk-ok',
      fetchImpl: (async () => new Response(
        JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 },
      )) as unknown as typeof fetch,
    });
    expect(r.ok).toBe(true);
    expect(renderVerdict(r)).toContain(t('en', 'byokTestOk'));
    restore();
  });

  it('an empty key is refused before any network call', async () => {
    let called = false;
    const r = await probeBrain('deepseek', {
      key: '',
      fetchImpl: (async () => { called = true; return new Response('', { status: 200 }); }) as unknown as typeof fetch,
    });
    expect(r.verdict).toBe('nokey');
    expect(called).toBe(false);
    restore();
  });

  it('a thrown probe error is shown, never swallowed', () => {
    // The component's catch path renders verdict 'error' ??assert that state
    // has its own line rather than a blank box.
    const html = renderVerdict({ verdict: 'error', ok: false, detail: 'boom', model: 'm', ms: 12 });
    expect(html).toContain(t('en', 'byokTestError'));
    expect(html).toContain('boom');
    restore();
  });

  it('every verdict has its own sentence', () => {
    const keys = Object.values(VERDICT_KEY);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(STRINGS[k].en.length, k).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// 4. The key never leaks: not into the DOM, not into a log
// ---------------------------------------------------------------------------

describe('a saved key never appears in the DOM or a log', () => {
  let restore: () => void;
  const SECRET = 'sk-live-DO-NOT-LEAK-9f3a2b';

  beforeEach(() => { restore = swapLs(); });

  it('is absent from the rendered sheet after saving', () => {
    setBrainKey('deepseek', SECRET);
    setBrainProvider('deepseek');
    const html = renderSheet();
    expect(html).not.toContain(SECRET);
    expect(html).not.toContain('DO-NOT-LEAK');
    restore();
  });

  it('is redacted out of the provider error shown to the user', async () => {
    // Some gateways echo part of the credential back in the error body.
    const r = await probeBrain('deepseek', {
      key: SECRET,
      fetchImpl: (async () => new Response(
        `Incorrect API key provided: ${SECRET}`, { status: 401 },
      )) as unknown as typeof fetch,
    });
    expect(r.detail).not.toContain(SECRET);
    expect(r.detail).toContain('***');
    expect(renderToStaticMarkup(createElement(BrainVerdict, { lang: 'en', result: r }))).not.toContain(SECRET);
    restore();
  });

  it('the UI source logs nothing at all', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const f of ['components/BrainByok.tsx', 'lib/brain.ts']) {
      const src = readFileSync(join(__dirname, '..', f), 'utf8');
      expect(src, `${f} must not log`).not.toMatch(/console\.(log|info|warn|error|debug)/);
      // Match CALLS, not the prose in the file's own header comment.
      expect(src, `${f} must not beacon the key out`).not.toMatch(/navigator\.sendBeacon\s*\(/);
      expect(src, `${f} must not call analytics`).not.toMatch(/\b(gtag|dataLayer|analytics\.(track|identify|page))\s*\(/);
    }
    restore();
  });
});

// ---------------------------------------------------------------------------
// Model ids: every one is alive, because a dead id hard-fails every call
// ---------------------------------------------------------------------------

describe('brain model ids are current', () => {
  it('none of the retired ids are back', () => {
    const retired = [
      'llama-3.3-70b-versatile', // Groq shutdown 2026-08-16
      'kimi-k2.5',               // Moonshot: Deprecated
      'openai/gpt-oss-20b:free', // gone from OpenRouter's catalogue
    ];
    for (const spec of BRAIN_SPECS) {
      expect(retired, `${spec.id} still points at a dead model`).not.toContain(spec.model);
    }
  });

  it('Groq points at a model on its current free list', () => {
    const groq = BRAIN_SPECS.find((s) => s.id === 'groq')!;
    // Groq's free plan covers gpt-oss-120b / gpt-oss-20b / qwen3.8-27b.
    expect(groq.model).toBe('openai/gpt-oss-120b');
  });

  it('only verifiable regional notes are shown', () => {
    const noted: BrainId[] = BRAIN_SPECS.filter((s) => s.region).map((s) => s.id);
    expect(noted.sort()).toEqual(['groq', 'openrouter']);
  });
});


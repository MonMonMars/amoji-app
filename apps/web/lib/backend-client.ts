'use client';
// Optional production API. GitHub Pages leaves NEXT_PUBLIC_AMOJI_API unset,
// so every helper returns immediately and the static demo stays on-device.

const SESSION_KEY = 'amoji.backend.session';

export interface ProductionChatBody {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  persona?: string;
  memory?: string;
  language?: string;
  world?: string;
  worldSpoken?: string;
}

export interface ProductionChatResult {
  reply: string;
  emotionHints: Record<string, number>;
}

export function productionApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_AMOJI_API ?? '').trim();
  return raw.replace(/\/$/, '');
}

function remember(token: string): void {
  try { localStorage.setItem(SESSION_KEY, token); } catch { /* private mode */ }
}

function remembered(): string {
  try { return localStorage.getItem(SESSION_KEY) ?? ''; } catch { return ''; }
}

export function clearProductionSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

async function ensureSession(base: string): Promise<string | null> {
  const existing = remembered();
  if (existing) return existing;
  const res = await fetch(`${base}/api/auth/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) return null;
  const data = await res.json() as { token?: unknown };
  if (typeof data.token !== 'string' || !data.token) return null;
  remember(data.token);
  return data.token;
}

/** Chat on the production API. Null when the build has no API origin. */
export async function productionChat(body: ProductionChatBody): Promise<ProductionChatResult | null> {
  const base = productionApiBase();
  if (!base || typeof fetch === 'undefined') return null;
  const send = async (token: string): Promise<Response> => fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  try {
    let token = await ensureSession(base);
    if (!token) return null;
    let res = await send(token);
    if (res.status === 401) {
      clearProductionSession();
      token = await ensureSession(base);
      if (!token) return null;
      res = await send(token);
    }
    if (!res.ok) return null;
    const data = await res.json() as { reply?: unknown; emotionHints?: unknown };
    const reply = typeof data.reply === 'string' ? data.reply : '';
    const emotionHints: Record<string, number> = {};
    if (data.emotionHints && typeof data.emotionHints === 'object') {
      for (const [k, v] of Object.entries(data.emotionHints as Record<string, unknown>)) {
        if (typeof v === 'number') emotionHints[k] = v;
      }
    }
    return { reply, emotionHints };
  } catch {
    return null;
  }
}

/** Push the device prefs + wardrobe when a production origin is configured. */
export function scheduleStatePush(): void {
  const base = productionApiBase();
  if (!base || typeof localStorage === 'undefined') return;
  void (async () => {
    const token = await ensureSession(base);
    if (!token) return;
    let prefs: Record<string, unknown> | null = null;
    let wardrobe: Record<string, unknown> | null = null;
    try { prefs = JSON.parse(localStorage.getItem('amoji.prefs.v1') ?? 'null') as Record<string, unknown> | null; } catch { prefs = null; }
    try { wardrobe = JSON.parse(localStorage.getItem('amoji.modular.v1') ?? 'null') as Record<string, unknown> | null; } catch { wardrobe = null; }
    const body: Record<string, unknown> = {};
    if (prefs) {
      if (typeof prefs.character === 'string') body.characterId = prefs.character;
      if (typeof prefs.background === 'string') body.backgroundId = prefs.background;
      if (typeof prefs.lang === 'string') body.lang = prefs.lang;
      if (typeof prefs.kidMode === 'boolean') body.kidMode = prefs.kidMode;
    }
    if (wardrobe && typeof wardrobe.headId === 'string' && typeof wardrobe.bodyId === 'string') {
      body.wardrobe = { headId: wardrobe.headId, bodyId: wardrobe.bodyId };
    }
    await fetch(`${base}/api/state`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  })().catch(() => undefined);
}

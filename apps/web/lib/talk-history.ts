// Encrypted talk history.
// Primary store: free Supabase project amoji-talk (ap-southeast-1).
// Backup: an on-device journal that replays when the network returns.
// The utterance text is sealed with a device key before it leaves the
// browser. The server keeps ciphertext plus emotion weights, not plaintext.

import { analyzeText } from '@amoji/emotion-core';

export const TALK_SUPABASE_URL = 'https://fvzvmdpxlgikyaaadfbz.supabase.co';
/** Publishable anon key. Row text is ciphertext; this key cannot read it. */
export const TALK_SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2enZtZHB4bGdpa3lhYWFkZmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMzgxMDQsImV4cCI6MjEwODkxNDEwNH0.D5bvGT6GSlBlPpCaESSBe1f8nwf5eAERZy-_BnifPYQ';

const DEVICE_KEY = 'amoji.talkDevice.v1';
const SECRET_KEY = 'amoji.talkSecret.v1';
const JOURNAL_KEY = 'amoji.talkJournal.v1';

export interface TalkEmotions {
  [emotion: string]: number;
}

export interface TalkSeal {
  cipher: string;
  iv: string;
  emotions: TalkEmotions;
  chars: number;
}

export interface TalkJournalRow extends TalkSeal {
  role: 'user' | 'assistant';
  synced: boolean;
}

export function summarizeTalk(text: string): { emotions: TalkEmotions; chars: number } {
  const emotions: TalkEmotions = {};
  for (const [key, weight] of Object.entries(analyzeText(text))) {
    if (typeof weight === 'number' && weight > 0) emotions[key] = weight;
  }
  return { emotions, chars: text.trim().length };
}

/** Top emotion across recent user lines. Empty when there is no signal. */
export function talkMood(rows: readonly { role: string; emotions: TalkEmotions }[]): string | null {
  const totals: TalkEmotions = {};
  for (const row of rows) {
    if (row.role !== 'user') continue;
    for (const [key, weight] of Object.entries(row.emotions)) {
      totals[key] = (totals[key] ?? 0) + weight;
    }
  }
  let best: string | null = null;
  let score = 0;
  for (const [key, weight] of Object.entries(totals)) {
    if (weight > score) { best = key; score = weight; }
  }
  return best;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function copyBytes(secret: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(secret.byteLength));
  out.set(secret);
  return out;
}

export async function sealTalk(text: string, secret: Uint8Array): Promise<TalkSeal> {
  const summary = summarizeTalk(text);
  const key = await crypto.subtle.importKey('raw', copyBytes(secret), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text.slice(0, 2000)),
  );
  return { cipher: bytesToB64(new Uint8Array(cipher)), iv: bytesToB64(iv), ...summary };
}

export async function openTalk(seal: Pick<TalkSeal, 'cipher' | 'iv'>, secret: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', copyBytes(secret), 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(seal.iv) },
    key,
    b64ToBytes(seal.cipher),
  );
  return new TextDecoder().decode(plain);
}

function storage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

function deviceId(): string {
  const box = storage();
  if (!box) return '';
  let id = box.getItem(DEVICE_KEY);
  if (!id || id.length < 16) {
    id = crypto.randomUUID().replace(/-/g, '');
    box.setItem(DEVICE_KEY, id);
  }
  return id;
}

function deviceSecret(): Uint8Array<ArrayBuffer> | null {
  const box = storage();
  if (!box || typeof crypto === 'undefined' || !crypto.subtle) return null;
  let raw = box.getItem(SECRET_KEY);
  if (!raw) {
    raw = bytesToB64(crypto.getRandomValues(new Uint8Array(32)));
    box.setItem(SECRET_KEY, raw);
  }
  const bytes = b64ToBytes(raw);
  return bytes.length === 32 ? bytes : null;
}

function readJournal(): TalkJournalRow[] {
  const box = storage();
  if (!box) return [];
  try {
    const parsed = JSON.parse(box.getItem(JOURNAL_KEY) || '[]') as unknown;
    return Array.isArray(parsed) ? parsed as TalkJournalRow[] : [];
  } catch { return []; }
}

function writeJournal(rows: TalkJournalRow[]): void {
  const box = storage();
  if (!box) return;
  const kept = rows.slice(-80);
  try { box.setItem(JOURNAL_KEY, JSON.stringify(kept)); } catch { /* full */ }
}

async function postSupabase(device: string, role: TalkJournalRow['role'], seal: TalkSeal): Promise<boolean> {
  try {
    const res = await fetch(`${TALK_SUPABASE_URL}/rest/v1/talk_turns`, {
      method: 'POST',
      headers: {
        apikey: TALK_SUPABASE_ANON,
        Authorization: `Bearer ${TALK_SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        device_id: device,
        role,
        cipher: seal.cipher,
        iv: seal.iv,
        emotions: seal.emotions,
        chars: seal.chars,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Save one utterance. Plain text stays on this device; the cloud row is sealed. */
export async function archiveTalkLine(role: 'user' | 'assistant', text: string): Promise<void> {
  const clean = text.trim();
  if (!clean || clean === '…') return;
  const secret = deviceSecret();
  const device = deviceId();
  if (!secret || !device) return;
  const seal = await sealTalk(clean, secret);
  const row: TalkJournalRow = { ...seal, role, synced: false };
  const journal = readJournal();
  journal.push(row);
  const ok = await postSupabase(device, role, seal);
  row.synced = ok;
  writeJournal(journal);
}

/** Recent on-device rows, used to tint the next reply. */
export function recentTalkJournal(): TalkJournalRow[] {
  return readJournal();
}

/** User-turn mood from the local journal. */
export function recentUserMood(): string | null {
  return talkMood(readJournal());
}

// TTS-001..TTS-218 keep/delete catalog for the four app languages.
// Numbers are voice pick ids only — not CLIP_LIBRARY / reaction SFX #N.
// Edge rows may be previewed (the Microsoft endpoint often refuses this app).
// Other rows are listed so Mon can keep or delete them; they are not bundled.

import catalog from '../data/tts-app-voice-picks.json';
import type { VoiceLocale } from './voice-catalog';

export const TTS_APP_PICK_STORAGE_KEY = 'amoji.ttsAppPicks.v1';

export type TtsAppPickKind = 'edge' | 'link';
export type TtsAppPickVerdict = 'keep' | 'delete';

export interface TtsAppPick {
  id: string;
  name: string;
  preferred: boolean;
  gender: string;
  engine: string;
  kind: TtsAppPickKind;
  locales: VoiceLocale[];
  note?: string;
  edgeVoiceId?: string;
}

interface CatalogFile {
  rows: TtsAppPick[];
}

const FILE = catalog as CatalogFile;

export const TTS_APP_PICKS: readonly TtsAppPick[] = FILE.rows;

export const TTS_APP_PICK_COUNTS: Record<VoiceLocale, { total: number; edge: number; link: number }> = {
  yue: { total: 0, edge: 0, link: 0 },
  zh: { total: 0, edge: 0, link: 0 },
  ja: { total: 0, edge: 0, link: 0 },
  en: { total: 0, edge: 0, link: 0 },
};

for (const row of TTS_APP_PICKS) {
  for (const locale of row.locales) {
    TTS_APP_PICK_COUNTS[locale].total += 1;
    TTS_APP_PICK_COUNTS[locale][row.kind] += 1;
  }
}

export function ttsAppPickById(id: string): TtsAppPick | undefined {
  return TTS_APP_PICKS.find((row) => row.id === id);
}

export function ttsAppPicksForLocale(locale: VoiceLocale): readonly TtsAppPick[] {
  return TTS_APP_PICKS.filter((row) => row.locales.includes(locale));
}

export function ttsAppPickGender(row: TtsAppPick): 'female' | 'male' {
  const g = row.gender.trim().toUpperCase();
  if (g === 'M' || g.startsWith('M/')) return 'male';
  if (g === 'F') return 'female';
  const id = (row.edgeVoiceId || row.name).toLowerCase();
  if (/(wanlung|yunjian|yunxi|yunyang|yunjhe|keita|guy|william|liam|ryan|thomas|sam|connor|prabhat|chilemba|abeo|mitchell|james|wayne|elimu|andrew|brian|christopher|eric|roger|steffan|luke)\b/.test(id)) {
    return 'male';
  }
  return 'female';
}

type PickMap = Partial<Record<string, TtsAppPickVerdict>>;

function readMap(): PickMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(TTS_APP_PICK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PickMap;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: PickMap = {};
    for (const [id, verdict] of Object.entries(parsed)) {
      if (verdict === 'keep' || verdict === 'delete') out[id] = verdict;
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: PickMap): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TTS_APP_PICK_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

export function ttsAppPickVerdict(id: string): TtsAppPickVerdict | null {
  return readMap()[id] ?? null;
}

export function setTtsAppPickVerdict(id: string, verdict: TtsAppPickVerdict | null): TtsAppPickVerdict | null {
  const map = readMap();
  if (!verdict) delete map[id];
  else map[id] = verdict;
  writeMap(map);
  return verdict;
}

export function ttsAppPickVerdictMap(): PickMap {
  return readMap();
}

export function ttsAppPickShortName(row: TtsAppPick): string {
  if (row.kind === 'edge' && row.edgeVoiceId) {
    const parts = row.edgeVoiceId.split('-');
    const last = parts[parts.length - 1] || row.edgeVoiceId;
    return last.replace(/Neural$/i, '').replace(/Multilingual$/i, '') || row.edgeVoiceId;
  }
  return row.name;
}

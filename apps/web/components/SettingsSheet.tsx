'use client';
// Settings menu — ONE location for every setting (r2026-10-02.7).
// Sections: Companion (character + scene), Language, Voice, Memory & data
// (v2 browser: view / teach / copy / forget), Help (tutorial).
// Reachable from the chat room gear (top right).
import { useEffect, useRef, useState } from 'react';
import { CHARACTERS, BACKGROUNDS, t, type Prefs, type StrKey } from '../lib/prefs';
import { LangChips } from './selectors';
import { speak, voiceEnabled, setVoiceEnabled, neuralEnabled, setNeuralEnabled } from '../lib/voice';
import { pickLine } from '../lib/chatter';
import { feedUtterance } from '../lib/companion';
import { notifySpeaking } from '../lib/speech';
import { loadProfile, saveProfile } from '../lib/profile';
import { saveHistory } from '../lib/companion-store';
import { APP_REVISION } from '../lib/revision';
import {
  addEntry, deleteEntry, exportMemory, loadMemory,
  type Memory, type MemoryType,
} from '../lib/memory';

function Toggle({ on, onClick, accent }: { on: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? '' : 'bg-white/15'}`}
      style={on ? { backgroundColor: accent } : undefined}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-white/50">{title}</h3>
      {children}
    </section>
  );
}

const TYPE_KEY: Record<MemoryType, StrKey> = {
  preference: 'memoryTypePreference',
  event: 'memoryTypeEvent',
  plan: 'memoryTypePlan',
};

const TYPE_STYLE: Record<MemoryType, string> = {
  preference: 'bg-pink-400/15 text-pink-200',
  event: 'bg-sky-400/15 text-sky-200',
  plan: 'bg-amber-400/15 text-amber-200',
};

/** "Wed Oct 01 2026" → "Oct 01" */
const shortDay = (day: string): string => (day ? day.slice(4, 10) : '');

export default function SettingsSheet({
  open,
  prefs,
  onChange,
  onClose,
  memCount,
  onForget,
}: {
  open: boolean;
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
  onClose: () => void;
  memCount: number;
  onForget: () => void;
}) {
  const [voiceOn, setVoiceOnState] = useState(voiceEnabled());
  const [neuralOn, setNeuralOnState] = useState(neuralEnabled());
  const [name, setName] = useState(() => loadProfile().name);
  const [mem, setMem] = useState<Memory>(loadMemory);
  const [copied, setCopied] = useState(false);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<MemoryType>('preference');
  const tutorNRef = useRef(0);
  useEffect(() => {
    if (open) { setMem(loadMemory()); setCopied(false); }
  }, [open]);
  if (!open) return null;
  const lang = prefs.lang;
  const accent = '#f9a8d4';

  const row = 'flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3';
  const label = 'text-sm text-white/85';

  const tutor = () => {
    const line = pickLine('tutor', lang, tutorNRef.current++);
    feedUtterance(line);
    notifySpeaking(line);
    speak(line, prefs.character, lang);
    onClose();
  };

  const clearHistory = () => {
    if (!window.confirm(t(lang, 'clearHistoryConfirm'))) return;
    saveHistory([]);
    window.dispatchEvent(new Event('amoji:clear-history'));
  };

  const forgetAll = () => {
    if (!window.confirm(t(lang, 'forgetConfirm'))) return;
    onForget();
    setMem(loadMemory());
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(exportMemory());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable — stay silent */ }
  };

  const removeEntry = (id: string) => {
    if (!window.confirm(t(lang, 'forgetOneConfirm'))) return;
    deleteEntry(id);
    setMem(loadMemory());
  };

  const addNew = () => {
    if (!newText.trim()) return;
    addEntry(newType, newText);
    setNewText('');
    setMem(loadMemory());
  };

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-neutral-950/90 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t(lang, 'settings')}</h2>
          <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20">✕</button>
        </div>

        <div className="space-y-6">
          <Section title={t(lang, 'settingsCompanion')}>
            {/* character picker — horizontal scroll */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CHARACTERS.map((c) => {
                const active = c.id === prefs.character;
                return (
                  <button
                    key={c.id}
                    onClick={() => onChange({ character: c.id })}
                    className={`flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all ${
                      active ? 'border-transparent bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                    style={active ? { boxShadow: `0 0 0 2px ${c.accent}` } : undefined}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-black/70"
                      style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${c.accent})` }}
                    >
                      {c.name[0]}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {c.name}
                      <span className="ml-1 text-[10px] font-normal text-white/50">{c.gender === 'female' ? '♀' : '♂'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {/* scene picker */}
            <p className="pt-1 text-xs text-white/50">{t(lang, 'settingsScene')}</p>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUNDS.map((b) => {
                const active = b.id === prefs.background;
                return (
                  <button
                    key={b.id}
                    onClick={() => onChange({ background: b.id })}
                    className={`overflow-hidden rounded-xl border text-left transition-all ${
                      active ? 'border-white/80' : 'border-white/10 hover:border-white/40'
                    }`}
                  >
                    <span className="block h-9 w-full" style={{ background: b.css }} />
                    <span className="block bg-black/50 px-1.5 py-1 text-[10px] text-white/80">{t(lang, b.nameKey as never)}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={t(lang, 'chooseLanguage')}>
            <LangChips value={prefs.lang} onChange={(l) => onChange({ lang: l })} />
          </Section>

          <Section title={t(lang, 'settingsVoice')}>
            <div className={row}>
              <span className={label}>🔊 {t(lang, 'voiceReplies')}</span>
              <Toggle
                on={voiceOn}
                accent={accent}
                onClick={() => { const next = !voiceOn; setVoiceOnState(next); setVoiceEnabled(next); }}
              />
            </div>
            <div className={row}>
              <span className={label}>✨ {t(lang, 'neuralVoice')}</span>
              <Toggle
                on={neuralOn}
                accent={accent}
                onClick={() => { const next = !neuralOn; setNeuralOnState(next); setNeuralEnabled(next); }}
              />
            </div>
          </Section>

          <Section title={t(lang, 'settingsData')}>
            {/* header row: count + copy-all + forget-all */}
            <div className={row}>
              <span className={label}>🧠 {t(lang, 'memoryTitle')}
                <span className="ml-2 text-xs text-white/40">{memCount > 0 ? `${memCount}` : '—'}</span>
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => void copyAll()}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20"
                >
                  {copied ? t(lang, 'memoryCopied') : t(lang, 'memoryExport')}
                </button>
                <button
                  onClick={forgetAll}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20"
                >
                  {t(lang, 'forgetBtn')}
                </button>
              </div>
            </div>

            {/* memory browser — everything she remembers, editable */}
            <p className="text-xs text-white/50">{t(lang, 'memoryBrowser')}</p>
            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {mem.entries.length === 0 && (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/35">{t(lang, 'memoryEmpty')}</p>
              )}
              {[...mem.entries].reverse().map((e) => (
                <div key={e.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] ${TYPE_STYLE[e.type]}`}>
                    {t(lang, TYPE_KEY[e.type])}
                  </span>
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-white/80">{e.text}</span>
                  {e.dueDay && (
                    <span className="shrink-0 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-200/80">{shortDay(e.dueDay)}</span>
                  )}
                  {!e.dueDay && e.day && <span className="shrink-0 pt-0.5 text-[10px] text-white/30">{shortDay(e.day)}</span>}
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="shrink-0 rounded-full px-1.5 text-xs text-white/30 transition hover:bg-white/10 hover:text-white/70"
                    aria-label="forget"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* teach her something new */}
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex gap-1.5">
                {(['preference', 'event', 'plan'] as MemoryType[]).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setNewType(tp)}
                    className={`rounded-full px-2.5 py-1 text-[10px] transition ${
                      newType === tp ? `${TYPE_STYLE[tp]} ring-1 ring-white/30` : 'bg-white/5 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {t(lang, TYPE_KEY[tp])}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNew()}
                  placeholder={t(lang, 'memoryAddPlaceholder')}
                  className="h-9 min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-3 text-xs text-white placeholder-white/30 outline-none focus:border-white/40"
                />
                <button
                  onClick={addNew}
                  disabled={!newText.trim()}
                  className="h-9 shrink-0 rounded-full bg-white/10 px-3.5 text-xs text-white/80 transition hover:bg-white/20 disabled:opacity-40"
                >
                  {t(lang, 'memoryAdd')}
                </button>
              </div>
            </div>

            <div className={row}>
              <span className={label}>💬 {t(lang, 'clearHistory')}</span>
              <button
                onClick={clearHistory}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>
            <div className={`${row} !justify-start gap-3`}>
              <span className={label}>👤 {t(lang, 'yourName')}</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  saveProfile({ name: e.target.value });
                }}
                className="h-8 min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
                placeholder="Simon"
              />
            </div>
          </Section>

          <Section title={t(lang, 'settingsHelp')}>
            <button onClick={tutor} className={`${row} w-full text-left transition hover:bg-white/10`}>
              <span className={label}>❓ {t(lang, 'tutorBtn')}</span>
              <span className="text-white/30">→</span>
            </button>
          </Section>

          <p className="pt-2 text-center text-[11px] text-white/25">Amoji · {APP_REVISION}</p>
        </div>
      </div>
    </div>
  );
}

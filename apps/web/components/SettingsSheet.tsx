'use client';
// Settings menu — ONE location for every setting (r2026-10-02.7; slimmed r2026-10-03.03).
// Sections: Mode (kid mode), Language, Voice, Brain (LLM provider + keys), Memory & data
// (v2 browser: view / teach / copy / forget + v3 emotion diary), Help (tutorial).
// Character & scene changing lives in the selection board (top-left name plate) —
// the gear no longer duplicates it. Reachable from the chat room gear (top right).
// r2026-10-04.70: "You are" gender chips — secret (default) keeps the dialogue
// exactly as before; male/female calibrate her warmth vs best-mate tone.
import { useEffect, useRef, useState } from 'react';
import {
  characterById, backgroundById, KID_CHARACTER, KID_BACKGROUND,
  t, type Prefs, type StrKey,
} from '../lib/prefs';
import { LangChips } from './selectors';
import { speak, voiceEnabled, setVoiceEnabled, neuralEnabled, setNeuralEnabled } from '../lib/voice';
import { pickLine } from '../lib/chatter';
import { feedUtterance } from '../lib/companion';
import { notifySpeaking } from '../lib/speech';
import { loadProfile, saveProfile, type Gender } from '../lib/profile';
import { saveHistory } from '../lib/companion-store';
import { APP_REVISION } from '../lib/revision';
import {
  BRAIN_SPECS, brainKey, brainProvider, pickBrain, setBrainKey, setBrainProvider,
  type BrainProvider,
} from '../lib/brain';
import {
  addEntry, deleteEntry, deleteDiaryEntry, exportMemory, loadMemory,
  type Memory, type MemoryType,
} from '../lib/memory';

function Toggle({ on, onClick, accent }: { on: boolean; onClick: () => void; accent: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`ui-btn relative h-7 w-12 rounded-full transition-colors ${on ? '' : 'bg-white/15'}`}
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

/** mood dot colours for the diary browser (v3) */
const MOOD_DOT: Record<string, string> = {
  happy: 'bg-amber-300',
  tired: 'bg-slate-400',
  sad: 'bg-sky-400',
  angry: 'bg-red-400',
  anxious: 'bg-violet-400',
  sick: 'bg-emerald-300',
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
  const [gender, setGender] = useState<Gender>(() => loadProfile().gender);
  const [mem, setMem] = useState<Memory>(loadMemory);
  const [copied, setCopied] = useState(false);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<MemoryType>('preference');
  const [brain, setBrainState] = useState<BrainProvider>(brainProvider());
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const tutorNRef = useRef(0);
  useEffect(() => {
    if (open) { setMem(loadMemory()); setCopied(false); setBrainState(brainProvider()); setKeyDrafts({}); }
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

  // r70 — gender pick: persist + tell the chat panel to re-read the profile.
  // 'secret' (default) adds no guidance, so nothing changes for those users.
  const setGenderPick = (g: Gender) => {
    setGender(g);
    saveProfile({ ...loadProfile(), gender: g });
    window.dispatchEvent(new Event('amoji:profile'));
  };

  // Kid Mode: turning it on swaps to a wholesome character + sunny scene.
  const toggleKid = () => {
    const next = !prefs.kidMode;
    const patch: Partial<Prefs> = { kidMode: next };
    if (next) {
      if (!characterById(prefs.character).kidSafe) patch.character = KID_CHARACTER;
      if (!backgroundById(prefs.background).kidSafe) patch.background = KID_BACKGROUND;
    }
    onChange(patch);
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

  const removeDiary = (id: string) => {
    if (!window.confirm(t(lang, 'forgetOneConfirm'))) return;
    deleteDiaryEntry(id);
    setMem(loadMemory());
  };

  const addNew = () => {
    if (!newText.trim()) return;
    addEntry(newType, newText);
    setNewText('');
    setMem(loadMemory());
  };

  // Brain (LLM) settings — provider chips + per-provider key field.
  const setBrain = (id: BrainProvider) => { setBrainState(id); setBrainProvider(id); };
  const shownSpec = brain === 'auto'
    ? pickBrain().spec
    : (BRAIN_SPECS.find((s) => s.id === brain) ?? BRAIN_SPECS[BRAIN_SPECS.length - 1]!);
  const shownKey = keyDrafts[shownSpec.id] ?? brainKey(shownSpec.id);

  return (
    <div className="fx-fade-in absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fx-sheet-in h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-neutral-950/90 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t(lang, 'settings')}</h2>
          <button onClick={onClose} className="ui-btn rounded-full bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20">✕</button>
        </div>

        <div className="space-y-6">
          <Section title={t(lang, 'settingsMode')}>
            <div className={row}>
              <span className={label}>🧸 {t(lang, 'kidMode')}
                <span className="block text-[11px] text-white/40">{t(lang, 'kidModeHint')}</span>
              </span>
              <Toggle on={prefs.kidMode} accent={accent} onClick={toggleKid} />
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

          <Section title={t(lang, 'brainTitle')}>
            <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap gap-1.5">
                {(['auto', ...BRAIN_SPECS.map((s) => s.id)] as BrainProvider[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setBrain(id)}
                    className={`ui-btn rounded-full px-3 py-1.5 text-xs ${
                      brain === id
                        ? 'bg-pink-400/80 font-medium text-neutral-950'
                        : 'bg-white/5 text-white/50 hover:text-white/80'
                    }`}
                  >
                    {id === 'auto' ? t(lang, 'brainAuto') : (BRAIN_SPECS.find((s) => s.id === id)?.label ?? id)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-white/45">
                {brain === 'auto' ? t(lang, 'brainAutoHint') : shownSpec.blurb}
              </p>
              {!shownSpec.keyless && (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      autoComplete="off"
                      value={shownKey}
                      onChange={(e) => {
                        const v = e.target.value;
                        setKeyDrafts((d) => ({ ...d, [shownSpec.id]: v }));
                        setBrainKey(shownSpec.id, v);
                      }}
                      placeholder={t(lang, 'brainKeyPlaceholder')}
                      className="h-9 min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-3 text-xs text-white placeholder-white/30 outline-none focus:border-white/40"
                    />
                    <span className={`shrink-0 text-[11px] ${brainKey(shownSpec.id) ? 'text-emerald-300/80' : 'text-white/35'}`}>
                      {brainKey(shownSpec.id) ? '✓' : t(lang, 'brainNoKey')}
                    </span>
                  </div>
                  {shownSpec.keyFrom && (
                    <p className="mt-1.5 text-[10px] text-white/30">key → {shownSpec.keyFrom}</p>
                  )}
                </div>
              )}
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
                  className="ui-btn rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
                >
                  {copied ? t(lang, 'memoryCopied') : t(lang, 'memoryExport')}
                </button>
                <button
                  onClick={forgetAll}
                  className="ui-btn rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
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
                    className="ui-btn shrink-0 rounded-full px-1.5 text-xs text-white/30 hover:bg-white/10 hover:text-white/70"
                    aria-label="forget"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* emotion diary (v3) — read-only, mood-coloured, delete-only */}
            <p className="text-xs text-white/50">{t(lang, 'diaryTitle')}</p>
            <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
              {(!mem.diary || mem.diary.length === 0) && (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/35">{t(lang, 'diaryEmpty')}</p>
              )}
              {[...(mem.diary ?? [])].reverse().map((d) => (
                <div key={d.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${MOOD_DOT[d.mood ?? ''] ?? 'bg-white/25'}`} />
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-white/80">{d.text}</span>
                  <span className="shrink-0 pt-0.5 text-[10px] text-white/30">{shortDay(d.day)}</span>
                  <button
                    onClick={() => removeDiary(d.id)}
                    className="ui-btn shrink-0 rounded-full px-1.5 text-xs text-white/30 hover:bg-white/10 hover:text-white/70"
                    aria-label="forget diary line"
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
                    className={`ui-btn rounded-full px-2.5 py-1 text-[10px] ${
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
                  className="ui-btn h-9 shrink-0 rounded-full bg-white/10 px-3.5 text-xs text-white/80 hover:bg-white/20 disabled:opacity-40"
                >
                  {t(lang, 'memoryAdd')}
                </button>
              </div>
            </div>

            <div className={row}>
              <span className={label}>💬 {t(lang, 'clearHistory')}</span>
              <button
                onClick={clearHistory}
                className="ui-btn rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
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
                  saveProfile({ ...loadProfile(), name: e.target.value });
                }}
                className="h-8 min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
                placeholder="Simon"
              />
            </div>
            {/* r70 — gender drives the adaptive warmth; default 'secret' changes nothing */}
            <div className={`${row} !justify-start gap-3`}>
              <span className={label}>🚻 {t(lang, 'yourGender')}</span>
              <div className="flex min-w-0 flex-1 gap-1.5">
                {(['male', 'female', 'secret'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenderPick(g)}
                    className={`ui-btn h-8 flex-1 rounded-full px-2 text-xs ${
                      gender === g
                        ? 'bg-pink-400/80 font-medium text-neutral-950'
                        : 'bg-white/5 text-white/50 hover:text-white/80'
                    }`}
                  >
                    {t(lang, g === 'male' ? 'genderMale' : g === 'female' ? 'genderFemale' : 'genderSecret')}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title={t(lang, 'settingsHelp')}>
            <button onClick={tutor} className={`ui-btn ${row} w-full text-left hover:bg-white/10`}>
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

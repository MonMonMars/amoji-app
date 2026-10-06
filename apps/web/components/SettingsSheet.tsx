'use client';
// Settings menu — ONE location for every setting (r2026-10-02.7; slimmed r2026-10-03.03).
// Sections: Mode (kid mode), Language, Voice, Brain (LLM provider + keys), Memory & data
// (v2 browser: view / teach / copy / forget + v3 emotion diary), Help (tutorial).
// Character & scene changing lives in the selection board (top-left name plate) —
// the gear no longer duplicates it. Reachable from the chat room gear (top right).
// r2026-10-04.70: "You are" gender chips — secret (default) keeps the dialogue
// exactly as before; male/female calibrate her warmth vs best-mate tone.
// r2026-10-04.70c: the gender state admits undefined (profile.gender is
// optional) — a never-set profile just shows no chip highlighted.
// r2026-10-04.75: Voice section gains a one-tap "Test voice" self-test plus a
// blocked-sound hint, so a silent phone is diagnosable without a keyboard.
// r2026-10-05.99: the Test voice button now runs testVoiceChain() and shows a
// per-tier verdict (edge-tts / google-tts / browser ✓|✗), so a silent iPhone
// NAMES its dead tier instead of leaving the answer in the console.
// r2026-10-05.100: the Test voice handler now primes speechSynthesis with a
// zero-volume utterance SYNCHRONOUSLY inside the click — iOS only unlocks
// the engine within the gesture itself, and the first await below used to
// leave that context before any synth tier could run.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  characterById, backgroundById, KID_CHARACTER, KID_BACKGROUND,
  t, type Prefs, type StrKey,
} from '../lib/prefs';
import { LangChips } from './selectors';
import ModelThumb from './ModelThumb';
import { speak, voiceEnabled, setVoiceEnabled, neuralEnabled, setNeuralEnabled, testVoiceChain, testProxyVoice, testOpenAiVoice, VOICE_TIER_LABEL } from '../lib/voice';
// r2026-10-06.131: the Voice section's optional HTTP TTS proxy field
import { getTtsProxy, setTtsProxy } from '../lib/edge-tts';
// r2026-10-06.134: ChatGPT-voice (OpenAI tier 0) key + endpoint field
import { openAiKey, setOpenAiKey, openAiEndpoint, setOpenAiEndpoint, openAiEnabled, setOpenAiEnabled } from '../lib/openai-tts';
import { pickLine } from '../lib/chatter';
import { feedUtterance } from '../lib/companion';
import { notifySpeaking } from '../lib/speech';
import { loadProfile, saveProfile, type Gender } from '../lib/profile';
import { saveHistory } from '../lib/companion-store';
import { APP_REVISION } from '../lib/revision';
import { downloadCompanionFile, parseCompanionFile, applyCompanionFile } from '../lib/companion-file';
import {
  BRAIN_SPECS, brainKey, brainProvider, pickBrain, setBrainKey, setBrainProvider,
  type BrainProvider,
} from '../lib/brain';
import {
  addEntry, deleteEntry, deleteDiaryEntry, deleteImportantDate, deletePromise, exportMemory, loadMemory,
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
  const router = useRouter();
  const [voiceOn, setVoiceOnState] = useState(voiceEnabled());
  const [neuralOn, setNeuralOnState] = useState(neuralEnabled());
  const [voiceBlocked, setVoiceBlocked] = useState(false);
  // r99: per-tier self-test result — 'edge-tts ✓ · google-tts ✗ · browser ✓'
  const [voiceTest, setVoiceTest] = useState<string | null>(null);
  const [voiceTesting, setVoiceTesting] = useState(false);
  const [name, setName] = useState(() => loadProfile().name);
  const [gender, setGender] = useState<Gender | undefined>(() => loadProfile().gender);
  const [mem, setMem] = useState<Memory>(loadMemory);
  const [copied, setCopied] = useState(false);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<MemoryType>('preference');
  const [brain, setBrainState] = useState<BrainProvider>(brainProvider());
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  // r2026-10-06.131: HTTP TTS proxy draft — blank means "direct socket". The
  // value only takes effect on Save (or Clear), so typing never half-switches
  // a live voice chain.
  const [proxyDraft, setProxyDraft] = useState<string>(() => getTtsProxy() ?? '');
  const [proxySaved, setProxySaved] = useState(false);
  // r2026-10-06.133: the proxy probe — saves the draft, speaks one line
  // through the edge tier (proxy included) and shows ✓/✗ right here.
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<boolean | null>(null);
  // r2026-10-06.134: ChatGPT-voice (OpenAI tier 0) drafts — same save-then-apply
  // contract as the proxy field above.
  const [oaKeyDraft, setOaKeyDraft] = useState<string>(() => openAiKey());
  const [oaEpDraft, setOaEpDraft] = useState<string>(() => openAiEndpoint());
  const [oaOn, setOaOn] = useState<boolean>(() => openAiEnabled());
  const [oaSaved, setOaSaved] = useState(false);
  const [oaTesting, setOaTesting] = useState(false);
  const [oaTestResult, setOaTestResult] = useState<boolean | null>(null);
  const tutorNRef = useRef(0);
  // r2026-10-04.75: listen for the voice layer reporting a refused utterance
  // so the hint appears right where the toggles live.
  useEffect(() => {
    const onBlocked = () => setVoiceBlocked(true);
    window.addEventListener('amoji:voice-blocked', onBlocked);
    return () => window.removeEventListener('amoji:voice-blocked', onBlocked);
  }, []);
  useEffect(() => {
    if (open) { setMem(loadMemory()); setCopied(false); setBrainState(brainProvider()); setKeyDrafts({}); setProxyDraft(getTtsProxy() ?? ''); setProxySaved(false); setProxyTestResult(null); setProxyTesting(false); setOaKeyDraft(openAiKey()); setOaEpDraft(openAiEndpoint()); setOaOn(openAiEnabled()); setOaSaved(false); setOaTestResult(null); setOaTesting(false); }
  }, [open]);
  if (!open) return null;
  const lang = prefs.lang;
  // r112: the whole sheet is themed by the ACTIVE companion's accent — the
  // settings page now reads as "her" page, not a generic pink panel.
  const me = characterById(prefs.character);
  const scene = backgroundById(prefs.background);
  const accent = me.accent;

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

  // memory v6 — annual dates + her promises, delete-only like the diary
  const removeDate = (id: string) => {
    if (!window.confirm(t(lang, 'forgetOneConfirm'))) return;
    deleteImportantDate(id);
    setMem(loadMemory());
  };

  const removePromise = (id: string) => {
    if (!window.confirm(t(lang, 'forgetOneConfirm'))) return;
    deletePromise(id);
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

  // r99: run the per-tier chain probe and render its verdict under the button.
  // r100: iOS only unlocks speechSynthesis INSIDE the gesture handler — the
  // first await below leaves that context before any synth tier runs, so
  // prime the engine synchronously with a zero-volume utterance first (the
  // probe is the click's own first sound; volume 0 keeps it inaudible).
  const runVoiceTest = () => {
    try {
      const probe = new SpeechSynthesisUtterance('test');
      probe.volume = 0;
      probe.rate = 2;
      window.speechSynthesis.speak(probe);
    } catch { /* probe is best-effort */ }
    setVoiceBlocked(false);
    setVoiceTest(null);
    setVoiceTesting(true);
    void testVoiceChain(prefs.character, lang).then((results) => {
      setVoiceTesting(false);
      setVoiceTest(results.map((r) => `${VOICE_TIER_LABEL[r.tier]} ${r.ok ? '✓' : '✗'}`).join(' · '));
    }).catch(() => setVoiceTesting(false));
  };

  // r133: proxy probe — SAVE first so the spoken line exercises the exact URL
  // in the field (not the stale stored one), then one edge-tier line.
  const runProxyTest = () => {
    const v = proxyDraft.trim();
    setTtsProxy(v ? v.replace(/\/+$/, '') : null);
    setProxySaved(true);
    setProxyTestResult(null);
    setProxyTesting(true);
    void testProxyVoice(prefs.character, lang).then((ok) => {
      setProxyTesting(false);
      setProxyTestResult(ok);
    }).catch(() => { setProxyTesting(false); setProxyTestResult(false); });
  };

  // r134: ChatGPT-voice probe — same save-first contract: the spoken line
  // exercises the exact key/endpoint in the fields. No key → ✗ with the
  // "nothing to test" case folded into the same inline verdict.
  const runOpenAiTest = () => {
    setOpenAiKey(oaKeyDraft);
    setOpenAiEndpoint(oaEpDraft);
    setOaSaved(true);
    setOaTestResult(null);
    setOaTesting(true);
    void testOpenAiVoice(prefs.character, lang).then((ok) => {
      setOaTesting(false);
      setOaTestResult(ok);
    }).catch(() => { setOaTesting(false); setOaTestResult(false); });
  };

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
          {/* r112: companion identity card — her baked portrait, name, scene,
              one tap to the selection board. The sheet now opens with WHO
              you are talking to, themed in her accent. */}
          <button
            onClick={() => { onClose(); router.push('/change'); }}
            className="ui-btn group flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all"
            style={{
              borderColor: `${accent}44`,
              background: `linear-gradient(135deg, ${accent}14, transparent 60%)`,
              boxShadow: `0 8px 30px -14px ${accent}88`,
            }}
          >
            <span
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full"
              style={{ boxShadow: `0 0 0 2px ${accent}, 0 4px 14px -4px ${accent}` }}
            >
              <ModelThumb url={me.model} accent={me.accent} name={me.name} image={me.image} bakedId={me.id} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-base font-semibold text-white">
                {me.name}
                <span className="text-xs text-white/45">{me.gender === 'female' ? '♀' : '♂'}</span>
                {prefs.kidMode && <span className="text-[10px]">🧸</span>}
              </span>
              <span className="block truncate text-xs text-white/50">{me.tagline[lang] ?? me.tagline.en}</span>
              <span className="mt-0.5 block text-[11px]" style={{ color: `${accent}cc` }}>
                🎨 {t(lang, 'settingsScene')}: {t(lang, scene.nameKey as never)}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors group-hover:bg-white/20">
              {t(lang, 'changeCta')} →
            </span>
          </button>

          <Section title={`🧸 ${t(lang, 'settingsMode')}`}>
            <div className={row}>
              <span className={label}>🧸 {t(lang, 'kidMode')}
                <span className="block text-[11px] text-white/40">{t(lang, 'kidModeHint')}</span>
              </span>
              <Toggle on={prefs.kidMode} accent={accent} onClick={toggleKid} />
            </div>
          </Section>

          <Section title={`🌐 ${t(lang, 'chooseLanguage')}`}>
            <LangChips value={prefs.lang} onChange={(l) => onChange({ lang: l })} />
          </Section>

          <Section title={`🔊 ${t(lang, 'settingsVoice')}`}>
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
            {/* r2026-10-06.134 — ChatGPT-voice tier (OpenAI): key + optional
                endpoint proxy + one-tap probe. Strings predate the UI (r112);
                this is their first consumer. */}
            <div className="space-y-1.5">
              <div className={row}>
                <span className={label}>🤖 {t(lang, 'openaiVoice')}
                  <span className="block text-[11px] text-white/40">{t(lang, 'openaiVoiceHint')}</span>
                </span>
                <Toggle
                  on={oaOn}
                  accent={accent}
                  onClick={() => { const next = !oaOn; setOaOn(next); setOpenAiEnabled(next); }}
                />
              </div>
              <input
                type="password"
                autoComplete="off"
                value={oaKeyDraft}
                onChange={(e) => { setOaKeyDraft(e.target.value); setOaSaved(false); }}
                placeholder={t(lang, 'openaiKeyPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white/85 outline-none placeholder:text-white/30 focus:border-white/25"
              />
              <input
                value={oaEpDraft}
                onChange={(e) => { setOaEpDraft(e.target.value); setOaSaved(false); }}
                placeholder={t(lang, 'openaiEndpointPlaceholder')}
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white/85 outline-none placeholder:text-white/30 focus:border-white/25"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setOpenAiKey(oaKeyDraft); setOpenAiEndpoint(oaEpDraft); setOaSaved(true); }}
                  className="ui-btn rounded-full px-3 py-1.5 text-xs text-white/90"
                  style={{ backgroundColor: `${accent}2e` }}
                >
                  {t(lang, 'ttsProxySave')}
                </button>
                <button
                  onClick={runOpenAiTest}
                  disabled={oaTesting}
                  className="ui-btn rounded-full px-3 py-1.5 text-xs text-white/80 disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                >
                  {oaTesting ? '…' : t(lang, 'testVoiceBtn')}
                </button>
                {oaTesting ? (
                  <span className="text-[10px] text-white/45">…</span>
                ) : oaTestResult !== null ? (
                  <span className="text-[10px] text-white/45">{oaTestResult ? '✓' : '✗'}</span>
                ) : oaSaved ? (
                  <span className="text-[10px] text-white/45">✓</span>
                ) : null}
              </div>
              <p className="text-[10px] leading-relaxed text-white/40">{t(lang, 'openaiCostHint')}</p>
            </div>
            {/* r2026-10-06.131 — optional HTTP proxy for wss-blocked networks */}
            <div className="space-y-1.5">
              <div className={row}>
                <span className={label}>🛰️ {t(lang, 'ttsProxy')}</span>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => {
                      const v = proxyDraft.trim();
                      setTtsProxy(v ? v.replace(/\/+$/, '') : null);
                      setProxySaved(true);
                    }}
                    className="ui-btn rounded-full px-3 py-1.5 text-xs text-white/90"
                    style={{ backgroundColor: `${accent}2e` }}
                  >
                    {t(lang, 'ttsProxySave')}
                  </button>
                  <button
                    onClick={() => { setProxyDraft(''); setTtsProxy(null); setProxySaved(true); }}
                    className="ui-btn rounded-full px-3 py-1.5 text-xs text-white/60"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  >
                    {t(lang, 'ttsProxyClear')}
                  </button>
                  <button
                    onClick={runProxyTest}
                    disabled={proxyTesting}
                    className="ui-btn rounded-full px-3 py-1.5 text-xs text-white/80 disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  >
                    {proxyTesting ? '…' : t(lang, 'testVoiceBtn')}
                  </button>
                </div>
              </div>
              <input
                value={proxyDraft}
                onChange={(e) => { setProxyDraft(e.target.value); setProxySaved(false); }}
                placeholder={t(lang, 'ttsProxyPlaceholder')}
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white/85 outline-none placeholder:text-white/30 focus:border-white/25"
              />
              {proxyTesting ? (
                <p className="text-[10px] text-white/45">…</p>
              ) : proxyTestResult !== null ? (
                <p className="text-[10px] text-white/45">{proxyTestResult ? '✓' : '✗'}</p>
              ) : proxySaved ? (
                <p className="text-[10px] text-white/45">✓</p>
              ) : null}
              <p className="text-[10px] leading-relaxed text-white/40">{t(lang, 'ttsProxyHint')}</p>
            </div>
            <div className={row}>
              <span className={label}>🎙️ {t(lang, 'testVoice')}</span>
              <button
                onClick={runVoiceTest}
                disabled={voiceTesting}
                className="ui-btn shrink-0 rounded-full px-3.5 py-1.5 text-xs text-white/90 disabled:opacity-40"
                style={{ backgroundColor: `${accent}2e` }}
              >
                {voiceTesting ? '…' : t(lang, 'testVoiceBtn')}
              </button>
            </div>
            {voiceTest && (
              <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-white/70">
                voice: {voiceTest}
              </p>
            )}
            {voiceBlocked && (
              <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2.5 text-[11px] leading-relaxed text-amber-100/90">
                🔇 {t(lang, 'voiceBlockedHint')}
              </p>
            )}
          </Section>

          <Section title={`🧠 ${t(lang, 'brainTitle')}`}>
            <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap gap-1.5">
                {(['auto', ...BRAIN_SPECS.map((s) => s.id)] as BrainProvider[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setBrain(id)}
                    className={`ui-btn rounded-full px-3 py-1.5 text-xs ${
                      brain === id
                        ? 'font-medium text-neutral-950'
                        : 'bg-white/5 text-white/50 hover:text-white/80'
                    }`}
                    style={brain === id ? { backgroundColor: accent } : undefined}
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

          <Section title={`💾 ${t(lang, 'settingsData')}`}>
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

            {/* memory v6 — annual dates she celebrates (birthday…) */}
            <p className="text-xs text-white/50">{t(lang, 'datesTitle')}</p>
            <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
              {(!mem.importantDates || mem.importantDates.length === 0) && (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/35">{t(lang, 'datesEmpty')}</p>
              )}
              {[...(mem.importantDates ?? [])].reverse().map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-white/80">{d.label}</span>
                  <span className="shrink-0 rounded bg-pink-400/10 px-1.5 py-0.5 text-[10px] text-pink-200/80">{d.month}/{d.day}</span>
                  <button
                    onClick={() => removeDate(d.id)}
                    className="ui-btn shrink-0 rounded-full px-1.5 text-xs text-white/30 hover:bg-white/10 hover:text-white/70"
                    aria-label="forget date"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* memory v6 — things she promised, so the user can see (and release) her word */}
            <p className="text-xs text-white/50">{t(lang, 'promisesTitle')}</p>
            <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
              {(!mem.promises || mem.promises.length === 0) && (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/35">{t(lang, 'promisesEmpty')}</p>
              )}
              {[...(mem.promises ?? [])].reverse().map((p) => (
                <div key={p.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-white/80">{p.text}</span>
                  <span className="shrink-0 pt-0.5 text-[10px] text-white/30">{shortDay(p.day)}</span>
                  <button
                    onClick={() => removePromise(p.id)}
                    className="ui-btn shrink-0 rounded-full px-1.5 text-xs text-white/30 hover:bg-white/10 hover:text-white/70"
                    aria-label="forget promise"
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
            {/* r2026-10-05.122 — the Companion Card: her whole soul in one
                portable .aigf.json file. Export carries her to another
                device/app/body; import brings her back with memory intact. */}
            <div className={row}>
              <span className={label}>💾 {t(lang, 'companionFile')}</span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => downloadCompanionFile(APP_REVISION)}
                  className="ui-btn rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
                >
                  {t(lang, 'exportCompanion')}
                </button>
                <label className="ui-btn cursor-pointer rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20">
                  {t(lang, 'importCompanion')}
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      void file.text().then((text) => {
                        try {
                          applyCompanionFile(parseCompanionFile(text));
                        } catch (err) {
                          window.alert(t(lang, 'companionFileBad', { reason: String(err) }));
                        }
                      });
                    }}
                  />
                </label>
              </div>
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
                        ? 'font-medium text-neutral-950'
                        : 'bg-white/5 text-white/50 hover:text-white/80'
                    }`}
                    style={gender === g ? { backgroundColor: accent } : undefined}
                  >
                    {t(lang, g === 'male' ? 'genderMale' : g === 'female' ? 'genderFemale' : 'genderSecret')}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title={`❓ ${t(lang, 'settingsHelp')}`}>
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

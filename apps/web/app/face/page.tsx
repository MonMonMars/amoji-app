'use client';
// ─────────────────────────────────────────────────────────────────────────────
// /face — the plug-and-use Amoji robot display (B2B endpoint).
//
// A fullscreen OLED-black emotion face. Any robot (or any device with a
// screen) becomes emotive by pointing its display at this URL:
//
//   URL params
//     ?lang=yue|zh|ja|en        spoken language (default yue)
//     ?character=juno|nova|...  voice + personality (default juno)
//     ?say=你好                   boot line spoken on load
//     ?emotion=joy              boot emotion
//     ?auto=1                   hands-free voice loop (listen → think → speak)
//     ?subs=1                   show subtitles of what she says
//     ?debug=1                  status pill (mode / heard / said / revision)
//
//   postMessage / window.amoji API (from your robot stack, ROS bridge, iframe parent)
//     postMessage({type:'amoji:say', text:'...'})          she says it, face reacts
//     postMessage({type:'amoji:emotion', emotion:'joy', intensity:1})
//     postMessage({type:'amoji:listen'})                  start one voice exchange
//     postMessage({type:'amoji:stop'})                    stop speech + auto loop
//     window.amoji.say / .emotion / .listen / .stop / .face — same, direct
//
//   events she emits (parent window / robot stack)
//     {type:'amoji:state', mode:'idle'|'listening'|'thinking'|'speaking'}
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { AmojiFace } from '../../lib/robot-face';
import { clientChat } from '../../lib/client-chat';
import type { ChatMessage } from '../../lib/llm';
import { notifySpeaking, isSpeaking, sampleSpeech } from '../../lib/speech';
import { speak, stopSpeaking } from '../../lib/voice';
import { listenOnce, listenSupported } from '../../lib/listen';
import type { Lang } from '../../lib/prefs';
import { APP_REVISION } from '../../lib/revision';

const CHARACTERS = ['juno', 'nova', 'blaze', 'mochi', 'kai', 'luna', 'rin', 'ren'];
const LANGS = ['yue', 'zh', 'ja', 'en'];

type Mode = 'idle' | 'listening' | 'thinking' | 'speaking';

const MODE_LABEL: Record<Mode, string> = {
  idle: 'tap anywhere to talk',
  listening: '● listening',
  thinking: '◌ thinking',
  speaking: '◉ speaking',
};

export default function FacePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<AmojiFace | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [heard, setHeard] = useState('');
  const [said, setSaid] = useState('');
  const [debug, setDebug] = useState(false);
  const [subs, setSubs] = useState(false);
  const [micOk] = useState(listenSupported);
  const optsRef = useRef({ lang: 'yue' as Lang, character: 'juno', auto: false });
  const busyRef = useRef(false);
  const stoppedRef = useRef(false);
  const historyRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const lang = (LANGS as string[]).includes(q.get('lang') ?? '') ? (q.get('lang') as Lang) : 'yue';
    const character = CHARACTERS.includes(q.get('character') ?? '') ? q.get('character')! : 'juno';
    const auto = q.get('auto') === '1';
    optsRef.current = { lang, character, auto };
    setDebug(q.get('debug') === '1');
    setSubs(q.get('subs') === '1');

    const face = new AmojiFace({ canvas: canvasRef.current, holdMs: 5000 });
    face.start();
    faceRef.current = face;

    // gaze follows pointer / touch — robots map sensor input to setLook()
    const onMove = (e: PointerEvent) => {
      face.setLook((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove);

    // lipsync sampler — drives mouth from the pseudo-viseme clock
    let raf = 0;
    const tick = () => {
      const s = sampleSpeech();
      face.setVoiceLevel(s ? s.mouth : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // direct scripting handle
    const api = {
      say: (text: string) => sayLine(text),
      emotion: (name: string, intensity?: number) => face.setEmotion(name, intensity ?? 1),
      listen: () => { stoppedRef.current = false; void loopOnce(); },
      stop: () => stopAll(),
      face,
    };
    (window as unknown as { amoji: typeof api }).amoji = api;

    // iframe / robot-bridge control channel
    const onMsg = (e: MessageEvent) => {
      const d = e.data as Record<string, unknown> | null;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'amoji:say' && typeof d.text === 'string') api.say(d.text);
      else if (d.type === 'amoji:emotion' && typeof d.emotion === 'string') api.emotion(d.emotion, typeof d.intensity === 'number' ? d.intensity : 1);
      else if (d.type === 'amoji:listen') api.listen();
      else if (d.type === 'amoji:stop') api.stop();
    };
    window.addEventListener('message', onMsg);

    // URL-driven boot
    const bootSay = q.get('say');
    const bootEmotion = q.get('emotion');
    if (bootEmotion) face.setEmotion(bootEmotion, 1);
    if (bootSay) setTimeout(() => api.say(bootSay), 600);
    else if (auto) setTimeout(() => { void loopOnce(); }, 900);

    return () => {
      stoppedRef.current = true;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('message', onMsg);
      cancelAnimationFrame(raf);
      face.stop();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (m: Mode) => {
    setMode(m);
    try { window.parent?.postMessage({ type: 'amoji:state', mode: m }, '*'); } catch { /* cross-origin safe */ }
  };

  const sayLine = (text: string) => {
    const face = faceRef.current;
    if (!face || !text.trim()) return;
    stoppedRef.current = false;
    notifySpeaking(text);
    face.say(text);
    setSaid(text);
    emit('speaking');
    speak(text, optsRef.current.character, optsRef.current.lang, undefined);
    const wait = () => {
      if (stoppedRef.current) return;
      if (isSpeaking()) setTimeout(wait, 250);
      else emit('idle');
    };
    setTimeout(wait, 400);
  };

  const stopAll = () => {
    stoppedRef.current = true;
    stopSpeaking();
    emit('idle');
  };

  const waitForSpeechEnd = () =>
    new Promise<void>((resolve) => {
      const wait = () => {
        if (stoppedRef.current || !isSpeaking()) resolve();
        else setTimeout(wait, 250);
      };
      wait();
    });

  const loopOnce = async () => {
    const face = faceRef.current;
    if (!face || busyRef.current) return;
    if (!micOk) { face.setEmotion('confusion', 0.6); return; }
    busyRef.current = true;
    try {
      emit('listening');
      const text = await listenOnce(optsRef.current.lang);
      setHeard(text);
      historyRef.current.push({ role: 'user', content: text });

      emit('thinking');
      const { reply, emotionHints } = await clientChat(historyRef.current.slice(-10), {
        language: optsRef.current.lang,
        persona: 'You are the onboard companion of a robot with an emotive face. One or two short spoken sentences only.',
      });
      historyRef.current.push({ role: 'assistant', content: reply });
      if (Object.keys(emotionHints).length) face.showHints(emotionHints);

      notifySpeaking(reply);
      setSaid(reply);
      emit('speaking');
      speak(reply, optsRef.current.character, optsRef.current.lang, emotionHints);
      await waitForSpeechEnd();
      emit('idle');
    } catch {
      emit('idle');
      face.setEmotion('confusion', 0.5);
    } finally {
      busyRef.current = false;
      if (optsRef.current.auto && !stoppedRef.current) {
        setTimeout(() => { void loopOnce(); }, 1200);
      }
    }
  };

  const auto = optsRef.current.auto;

  return (
    <main
      className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-black select-none"
      onClick={() => { if (!auto) void loopOnce(); }}
    >
      <canvas ref={canvasRef} width={720} height={560} className="h-full max-h-[110vh] w-full object-contain" />

      {/* mode pill */}
      <div className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/45">
        {MODE_LABEL[mode]}
        {!micOk ? ' · mic unsupported' : ''}
      </div>

      {/* subtitles of what she says */}
      {subs && said && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 max-w-[88%] -translate-x-1/2 rounded-2xl bg-black/60 px-5 py-2.5 text-center text-base leading-relaxed text-white/90">
          {said}
        </div>
      )}

      {/* debug status pill */}
      {debug && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-[92%] -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-[11px] text-white/45">
          {APP_REVISION} · {optsRef.current.character} · {optsRef.current.lang} · {mode}
          {heard ? ` · heard: ${heard}` : ''}
          {said ? ` · said: ${said.slice(0, 60)}` : ''}
        </div>
      )}
    </main>
  );
}

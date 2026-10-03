'use client';
// The chat room — full-screen 3D companion, status plate (top left),
// settings gear (top right), boxless fading chat history + mic orb (bottom).
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatPanel from '../../components/ChatPanel';
import DevPanel from '../../components/DevPanel';
import FallbackNotice from '../../components/FallbackNotice';
import SceneBackdrop from '../../components/SceneBackdrop';
import SettingsSheet from '../../components/SettingsSheet';
import StatusPlate from '../../components/StatusPlate';
import { usePrefs, characterById, backgroundById, KID_PERSONA_GUARD } from '../../lib/prefs';
import { clearMemory, loadMemory, memorySummaryCount } from '../../lib/memory';
import type { ChatStatus } from '../../lib/status';

const CompanionCanvas = dynamic(() => import('../../components/CompanionCanvas'), { ssr: false });

export default function Chat() {
  const [prefs, setPrefs] = usePrefs();
  const router = useRouter();
  const [notice, setNotice] = useState<{ reason: 'webgl' | 'asset' } | null>(null);
  const [dev, setDev] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [memCount, setMemCount] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`') setDev((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMemCount(memorySummaryCount(loadMemory()));
  }, []);

  const character = characterById(prefs.character);
  const background = backgroundById(prefs.background);

  return (
    <main className="fx-page relative h-dvh w-screen overflow-hidden text-white" style={{ background: background.css }}>
      <SceneBackdrop background={background} />
      <CompanionCanvas
        accent={character.accent}
        seedKey={character.id}
        onNotice={setNotice}
        onPoke={() => setPokeCount((c) => c + 1)}
      />

      {/* top bar: status plate (left) + settings gear (right) */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
        <StatusPlate
          name={character.name}
          accent={character.accent}
          portrait={character.image}
          lang={prefs.lang}
          status={status}
          memCount={memCount}
          kid={prefs.kidMode}
          onOpenSelect={() => router.push('/change')}
        />
        <button
          onClick={() => setSheetOpen(true)}
          title={prefs.lang === 'yue' ? '設定' : 'Settings'}
          className="ui-btn rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 backdrop-blur-md hover:bg-black/50"
        >
          ⚙️
        </button>
      </div>

      {notice && <FallbackNotice reason={notice.reason} />}
      {dev && <DevPanel />}
      <SettingsSheet
        open={sheetOpen}
        prefs={prefs}
        onChange={setPrefs}
        onClose={() => setSheetOpen(false)}
        memCount={memCount}
        onForget={() => { clearMemory(); setMemCount(0); }}
      />

      <div className="absolute inset-x-0 bottom-0 z-10">
        <ChatPanel
          characterName={character.name}
          characterId={character.id}
          lang={prefs.lang}
          accent={character.accent}
          persona={prefs.kidMode ? `${character.persona}\n\n${KID_PERSONA_GUARD}` : character.persona}
          pokeCount={pokeCount}
          onStatus={setStatus}
          onMemCount={setMemCount}
        />
      </div>
    </main>
  );
}

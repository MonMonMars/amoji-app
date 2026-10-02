'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ChatPanel from '../../components/ChatPanel';
import DevPanel from '../../components/DevPanel';
import FallbackNotice from '../../components/FallbackNotice';
import SettingsSheet from '../../components/SettingsSheet';
import { usePrefs, characterById, backgroundById, t } from '../../lib/prefs';

const CompanionCanvas = dynamic(() => import('../../components/CompanionCanvas'), { ssr: false });

export default function Play() {
  const [prefs, setPrefs] = usePrefs();
  const [notice, setNotice] = useState<{ reason: 'webgl' | 'asset' } | null>(null);
  const [dev, setDev] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`') setDev((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const character = characterById(prefs.character);
  const background = backgroundById(prefs.background);

  return (
    <main className="relative h-screen w-screen overflow-hidden text-white" style={{ background: background.css }}>
      <CompanionCanvas
        accent={character.accent}
        onNotice={setNotice}
        onPoke={() => setPokeCount((c) => c + 1)}
      />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
        <Link href="/" className="rounded-full bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md hover:bg-black/50">
          ←
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md">
            {character.name}
          </span>
          <button
            onClick={() => setSheetOpen(true)}
            title={t(prefs.lang, 'settings')}
            className="rounded-full bg-black/30 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md hover:bg-black/50"
          >
            ⚙
          </button>
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-40 z-10 text-center text-xs text-white/40">
        {t(prefs.lang, 'tapHint')}
      </p>

      {notice && <FallbackNotice reason={notice.reason} />}
      {dev && <DevPanel />}
      <SettingsSheet open={sheetOpen} prefs={prefs} onChange={setPrefs} onClose={() => setSheetOpen(false)} />

      <div className="absolute inset-x-0 bottom-0 z-10">
        <ChatPanel
          characterName={character.name}
          characterId={character.id}
          lang={prefs.lang}
          accent={character.accent}
          persona={character.persona}
          pokeCount={pokeCount}
        />
      </div>
    </main>
  );
}

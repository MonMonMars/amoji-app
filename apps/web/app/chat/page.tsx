'use client';
// The chat room — full-screen 3D companion, status plate (top left),
// settings gear (top right), boxless fading chat history + mic orb (bottom).
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatPanel from '../../components/ChatPanel';
import MiniGamePicker, { MiniGameMenuButton } from '../../components/MiniGamePicker';
import DevPanel from '../../components/DevPanel';
import FallbackNotice from '../../components/FallbackNotice';
import SceneBackdrop from '../../components/SceneBackdrop';
import SettingsSheet from '../../components/SettingsSheet';
import StatusPlate from '../../components/StatusPlate';
import WardrobeSwap from '../../components/WardrobeSwap';
import { requestOpenMiniGame, subscribeMiniGameChrome } from '../../lib/minigames';
import { activeWardrobe } from '../../lib/modular/catalog';
import { useModularSelection } from '../../lib/modular/storage';
import { resolveMiniGameCompanion } from '../../lib/minigames/companion';
import type { ActionGame } from '../../lib/minigames/types';
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
  const [pokeZone, setPokeZone] = useState('');
  const [pokeDirection, setPokeDirection] = useState('front');
  const [handHold, setHandHold] = useState(0);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [memCount, setMemCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gameChromeHidden, setGameChromeHidden] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => subscribeMiniGameChrome(setGameChromeHidden), []);

  const openSelect = () => {
    if (leaving) return;
    const go = () => router.push('/change');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      go();
      return;
    }
    setLeaving(true);
    window.setTimeout(go, 340);
  };

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
  const storedWardrobe = useModularSelection();
  const wardrobe = activeWardrobe(character.id, storedWardrobe);
  const gameCompanion = resolveMiniGameCompanion(prefs.character, prefs.lastFemale);
  const canvasCharacter = gameChromeHidden ? gameCompanion : character;
  const canvasWardrobe = gameChromeHidden ? null : wardrobe;
  const startFromMenu = (kind: ActionGame) => {
    setPickerOpen(false);
    requestOpenMiniGame(kind);
  };

  return (
    <main
      className={`${leaving ? 'fx-select-out' : 'fx-select-in'} relative h-dvh w-screen overflow-hidden text-white`}
      style={{ background: background.css }}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-30 ${leaving ? 'fx-route-veil-out' : 'fx-route-veil-in'}`}
      />
      <SceneBackdrop background={background} />
      <CompanionCanvas
        accent={canvasCharacter.accent}
        seedKey={canvasCharacter.id}
        libraryOnly={gameChromeHidden}
        wardrobeHeadId={canvasWardrobe?.headId}
        wardrobeBodyId={canvasWardrobe?.bodyId}
        lighting={background.setting === 'indoor' ? 'indoor' : 'outdoor'}
        onNotice={setNotice}
        onPoke={(zone, direction) => { setPokeCount((c) => c + 1); setPokeZone(zone); setPokeDirection(direction || 'front'); }}
        onHandHold={() => setHandHold((c) => c + 1)}
      />

      {/* top bar: status plate (left) + mini-games, wardrobe, settings (right).
          Hidden for the whole title → play session so the HUD does not overlap it. */}
      {!gameChromeHidden && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3">
          <div className="pointer-events-auto min-w-0">
            <StatusPlate
              name={character.name}
              accent={character.accent}
              portrait={character.image}
              lang={prefs.lang}
              status={status}
              memCount={memCount}
              kid={prefs.kidMode}
              onOpenSelect={openSelect}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <WardrobeSwap
              lang={prefs.lang}
              characterId={character.id}
              onCharacter={(id) => setPrefs({ character: id })}
            />
            <button
              onClick={() => setSheetOpen(true)}
              title={prefs.lang === 'yue' ? '設定' : 'Settings'}
              aria-label={prefs.lang === 'yue' ? '設定' : 'Settings'}
              className="ui-btn pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base text-white/90 shadow-sm backdrop-blur-md hover:bg-black/50"
            >
              ⚙️
            </button>
            <MiniGameMenuButton lang={prefs.lang} onClick={() => setPickerOpen(true)} />
          </div>
        </div>
      )}

      {notice && !gameChromeHidden && <FallbackNotice reason={notice.reason} />}
      {dev && !gameChromeHidden && <DevPanel />}
      {!gameChromeHidden && (
        <SettingsSheet
          open={sheetOpen}
          prefs={prefs}
          onChange={setPrefs}
          onClose={() => setSheetOpen(false)}
          memCount={memCount}
          onForget={() => { clearMemory(); setMemCount(0); }}
        />
      )}

      {/* Empty margins pass through to the canvas. Only the chat controls take hits. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ChatPanel
          key={character.id}
          characterName={character.name}
          characterId={character.id}
          lang={prefs.lang}
          accent={character.accent}
          persona={prefs.kidMode ? `${character.persona}\n\n${KID_PERSONA_GUARD}` : character.persona}
          backgroundId={background.id}
          characterGender={character.gender}
          kidMode={prefs.kidMode}
          pokeCount={pokeCount}
          pokeZone={pokeZone}
          pokeDirection={pokeDirection}
          handHoldCount={handHold}
          onStatus={setStatus}
          onMemCount={setMemCount}
        />
      </div>
      {pickerOpen && (
        <MiniGamePicker
          lang={prefs.lang}
          onClose={() => setPickerOpen(false)}
          onPick={startFromMenu}
        />
      )}
    </main>
  );
}

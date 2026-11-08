'use client';
// The chat room — full-screen 3D companion, status plate (top left),
// settings gear (top right), boxless fading chat history + mic orb (bottom).
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatPanel from '../../components/ChatPanel';
import { resolveChatAutoIdle } from '../../lib/chat-auto-idle';
import MiniGamePicker, { MiniGameMenuButton } from '../../components/MiniGamePicker';
import DevPanel from '../../components/DevPanel';
import FallbackNotice from '../../components/FallbackNotice';
import SceneBackdrop from '../../components/SceneBackdrop';
import SettingsSheet from '../../components/SettingsSheet';
import MuteButton from '../../components/MuteButton';
import StatusPlate from '../../components/StatusPlate';
import RequireEntryGate from '../../components/RequireEntryGate';
import WardrobeSwap from '../../components/WardrobeSwap';
import { requestOpenMiniGame, subscribeMiniGameChrome } from '../../lib/minigames';
import { activeWardrobe } from '../../lib/modular/catalog';
import { useModularSelection } from '../../lib/modular/storage';
import { resolveMiniGameCompanion } from '../../lib/minigames/companion';
import type { ActionGame } from '../../lib/minigames/types';
import { usePrefs, characterById, backgroundById, KID_PERSONA_GUARD, t } from '../../lib/prefs';
import { activeStoryScene, storyPersonaSuffix } from '../../lib/story-session';
import { resolveStorySceneGlb } from '../../lib/stories';
import { clearMemory, loadMemory, memorySummaryCount } from '../../lib/memory';
import type { ChatStatus } from '../../lib/status';

const CompanionCanvas = dynamic(() => import('../../components/CompanionCanvas'), { ssr: false });

export default function Chat() {
  // r2026-11-08: the 18+ / audio gate renders INSTEAD of the room until it is
  // answered, so no model load, greeting voice or poke SFX can happen for a
  // user who has not confirmed they are an adult and can hear her. This is a
  // render-swap rather than a redirect because a redirect would let the room
  // mount and paint first.
  return (
    <RequireEntryGate>
      <ChatRoom />
    </RequireEntryGate>
  );
}

function ChatRoom() {
  const [prefs, setPrefs, prefsReady] = usePrefs();
  const router = useRouter();
  const [notice, setNotice] = useState<{ reason: 'webgl' | 'asset' } | null>(null);
  const [dev, setDev] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [pokeZone, setPokeZone] = useState('');
  const [pokeDirection, setPokeDirection] = useState('front');
  const [pokeSectionId, setPokeSectionId] = useState('');
  const [handHold, setHandHold] = useState(0);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [memCount, setMemCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gameChromeHidden, setGameChromeHidden] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [idleClip, setIdleClip] = useState<string | null>(null);
  // Hold chrome/canvas until amoji.prefs.v1 sync — same gate as /select prefsReady.
  const bootReady = prefsReady;

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
  useEffect(() => { setIdleClip(resolveChatAutoIdle({ assistantText: '' })); }, [character.id]);
  const background = backgroundById(prefs.background);
  const storyScene = activeStoryScene();
  const sceneGlbUrl = storyScene ? resolveStorySceneGlb(storyScene) : undefined;
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
      style={{ background: bootReady ? background.css : '#0a0a0f' }}
      aria-busy={!bootReady}
      aria-labelledby="amoji-chat-title"
    >
      <h1 id="amoji-chat-title" className="sr-only">
        {character.name}
      </h1>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-30 ${leaving ? 'fx-route-veil-out' : 'fx-route-veil-in'}`}
      />
      {bootReady && <SceneBackdrop background={background} />}
      {bootReady && (
        <CompanionCanvas
          accent={canvasCharacter.accent}
          sceneGlbUrl={sceneGlbUrl}
          seedKey={canvasCharacter.id}
          libraryOnly={gameChromeHidden}
          wardrobeHeadId={canvasWardrobe?.headId}
          wardrobeBodyId={canvasWardrobe?.bodyId}
          lighting={background.setting === 'indoor' ? 'indoor' : 'outdoor'}
          onNotice={setNotice}
          idleClip={gameChromeHidden ? null : idleClip}
          onPoke={(zone, direction, sectionId) => {
            setPokeCount((c) => c + 1);
            setPokeZone(zone);
            setPokeDirection(direction || 'front');
            setPokeSectionId(sectionId || '');
          }}
          onHandHold={() => setHandHold((c) => c + 1)}
        />
      )}
      {/* top bar: status plate (left) + mini-games, wardrobe, settings (right).
          Hidden for the whole title → play session so the HUD does not overlap it. */}
      {!gameChromeHidden && (
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 ${bootReady ? '' : 'opacity-0'}`}>
          <div className="pointer-events-auto min-w-0">
            <StatusPlate
              name={character.name}
              accent={character.accent}
              portrait={character.image}
              lang={prefs.lang}
              status={status}
              memCount={memCount}
              onOpenSelect={openSelect}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Hold until bootReady so MuteButton aria/title lang is not DEFAULT_PREFS (select prefsReady parity). */}
            {bootReady && <MuteButton lang={prefs.lang} compact />}
            <WardrobeSwap
              lang={prefs.lang}
              characterId={character.id}
              onCharacter={(id) => setPrefs({ character: id })}
            />
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              title={t(prefs.lang, 'settings')}
              aria-label={t(prefs.lang, 'settings')}
              data-dev="S1"
              className="ui-btn pointer-events-auto relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base text-white/90 shadow-sm backdrop-blur-md hover:bg-black/50 sm:h-10 sm:w-10"
            >
              ⚙️
            </button>
            <MiniGameMenuButton lang={prefs.lang} onClick={() => setPickerOpen(true)} />
          </div>
        </div>
      )}

      {notice && !gameChromeHidden && <FallbackNotice reason={notice.reason} lang={prefs.lang} />}
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
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 ${bootReady ? '' : 'opacity-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {bootReady && <ChatPanel
          key={`${character.id}:${prefs.lang}`}
          characterName={character.name}
          characterId={character.id}
          lang={prefs.lang}
          accent={character.accent}
          persona={(() => {
            const story = storyPersonaSuffix(prefs.lang);
            // r2026-11-08: `prefs.kidMode` is pinned false by loadPrefs/savePrefs
            // (adult-only product), so the KID_PERSONA_GUARD branch is now
            // unreachable. It is kept so the persisted field keeps a meaning
            // rather than being a dangling key in old records.
            const base = prefs.kidMode ? `${character.persona}\n\n${KID_PERSONA_GUARD}` : character.persona;
            return story ? `${base}\n\n${story}` : base;
          })()}
          backgroundId={background.id}
          characterGender={character.gender}
          kidMode={prefs.kidMode}
          pokeCount={pokeCount}
          pokeZone={pokeZone}
          pokeDirection={pokeDirection}
          pokeSectionId={pokeSectionId}
          handHoldCount={handHold}
          onStatus={setStatus}
          onMemCount={setMemCount}
          onAutoIdle={(clip) => setIdleClip(clip)}
        />}
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

'use client';
// Master mute control — silences all speaker output. Mic stays independent.
import { useEffect, useState } from 'react';
import { isMasterMuted, setMasterMuted, subscribeMasterMute } from '../lib/master-mute';
import { t, type Lang } from '../lib/prefs';

export default function MuteButton({
  lang,
  className = '',
  compact = false,
}: {
  lang: Lang;
  className?: string;
  /** Smaller hit target for dense chrome */
  compact?: boolean;
}) {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setMuted(isMasterMuted());
    return subscribeMasterMute(setMuted);
  }, []);

  const label = muted ? t(lang, 'unmuteAll') : t(lang, 'muteAll');
  const size = compact
    ? 'h-8 w-8 text-sm sm:h-9 sm:w-9'
    : 'h-10 w-10 text-base sm:h-11 sm:w-11';

  return (
    <button
      type="button"
      data-dev="M1"
      data-testid="master-mute"
      aria-pressed={muted}
      aria-label={label}
      title={label}
      onClick={() => setMasterMuted(!muted)}
      className={`ui-btn pointer-events-auto relative flex ${size} items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/90 shadow-sm backdrop-blur-md hover:bg-black/50 ${
        muted ? 'ring-1 ring-amber-300/70' : ''
      } ${className}`}
    >
      <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}
'use client';
// Painted anime backdrop + gradient fallback + animated particle layer,
// with a slow Ken-Burns drift so the scene always feels alive.
import { assetUrl } from '../lib/asset';
import type { BackgroundDef } from '../lib/prefs';
import SceneFX from './SceneFX';

export default function SceneBackdrop({
  background,
  animate = true,
  className,
}: {
  background: BackgroundDef;
  /** Ken-Burns drift + particles on/off (thumbnails keep it still) */
  animate?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
      style={{ background: background.css }}
      aria-hidden
    >
      {background.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetUrl(background.image)}
          alt=""
          draggable={false}
          className={`h-full w-full object-cover ${animate ? 'animate-kenburns' : ''}`}
        />
      )}
      {/* readability vignette so UI text floats above the painting */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
      {animate && <SceneFX fx={background.fx} />}
    </div>
  );
}

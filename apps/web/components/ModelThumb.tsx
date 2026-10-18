'use client';
// Small cast chips (selection row, settings, grids). Prefer a local 2D
// bighead still when one is passed; otherwise the free-library release PNG.
// Never /cast-thumbs (those bakes face the back) and never a runtime VRM frame.
import { useState } from 'react';
import { assetUrl } from '../lib/asset';

export default function ModelThumb({
  accent,
  name,
  image,
  bighead,
  crop = 'center',
}: {
  url?: string;
  accent: string;
  name: string;
  /** Release still. Used when bighead is absent or fails to load. */
  image?: string;
  /** Local /thumbs/bighead portrait. Optional. */
  bighead?: string;
  /** Ignored. Old /cast-thumbs/<id>.jpg bakes are back views. */
  bakedId?: string;
  /** face: keep hair and eyes on a tall select card. center: square chips. */
  crop?: 'center' | 'face';
}) {
  const primary = bighead ? assetUrl(bighead) : null;
  const fallback = image ? assetUrl(image) : null;
  const identity = `${primary ?? ''}|${fallback ?? ''}`;
  const [load, setLoad] = useState({ identity, step: 0 });
  const step = load.identity === identity ? load.step : 0;
  const poster = step === 0 ? (primary ?? fallback) : step === 1 ? fallback : null;
  const fail = () => setLoad({ identity, step: poster && poster === primary && fallback ? 1 : 2 });

  return (
    <span className="absolute inset-0 block">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          draggable={false}
          onError={fail}
          className={`absolute inset-0 h-full w-full object-cover ${crop === 'face' ? 'object-[center_18%]' : 'object-center'}`}
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-black/70"
          style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${accent})` }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

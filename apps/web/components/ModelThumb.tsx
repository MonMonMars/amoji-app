'use client';
// Small cast chips (selection row, settings, grids). Always the official
// front-facing cartoon still — want-list `image` is the free-library release
// PNG. Never /cast-thumbs (those bakes face the back) and never a runtime
// VRM frame (the uncalibrated camera also faces the back).
import { assetUrl } from '../lib/asset';

export default function ModelThumb({
  accent,
  name,
  image,
}: {
  url?: string;
  accent: string;
  name: string;
  image?: string;
  /** Ignored. Old /cast-thumbs/<id>.jpg bakes are back views. */
  bakedId?: string;
}) {
  const poster = image ? assetUrl(image) : null;

  return (
    <span className="absolute inset-0 block">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-center"
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

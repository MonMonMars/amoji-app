'use client';
// Runtime-rendered thumbnail chip (r2026-10-05.104) — see lib/modelThumb.ts.
// Replaces the per-card live WebGL busts with a cheap still: the model renders
// one offscreen frame, the JPEG dataURL is cached, and this chip fades it in
// when the card scrolls near the viewport. Painted art stays as the poster
// when the character ships a portrait; otherwise an accent monogram stands in
// until (and if) the render lands.
import { useEffect, useRef, useState } from 'react';
import { requestModelThumb } from '../lib/modelThumb';
import { assetUrl } from '../lib/asset';

export default function ModelThumb({
  url,
  accent,
  name,
  image,
}: {
  url?: string;
  accent: string;
  name: string;
  image?: string;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // lazy: only start the render once the card scrolls near the viewport
  useEffect(() => {
    const el = hostRef.current;
    if (!el || started) return;
    if (typeof IntersectionObserver === 'undefined') { setStarted(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setStarted(true); io.disconnect(); }
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || !url || thumb) return;
    let live = true;
    setLoading(true);
    requestModelThumb(url).then((dataUrl) => {
      if (live && dataUrl) setThumb(dataUrl);
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [started, url, thumb]);

  const poster = image ? assetUrl(image) : null;

  return (
    <span ref={hostRef} className="absolute inset-0 block">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-black/70"
          style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${accent})` }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      {loading && !thumb && <span className="absolute inset-0 animate-pulse bg-white/10" />}
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500 opacity-100"
        />
      )}
    </span>
  );
}

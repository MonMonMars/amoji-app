'use client';

export default function FallbackNotice({ reason }: { reason: 'webgl' | 'asset' }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
      <p className="rounded-full bg-black/60 px-4 py-1.5 text-xs text-amber-200">
        {reason === 'webgl'
          ? 'WebGL is unavailable in this browser — showing the calm view. Chat still works.'
          : 'Juno’s 3D model could not load — showing a placeholder. Chat still works.'}
      </p>
    </div>
  );
}

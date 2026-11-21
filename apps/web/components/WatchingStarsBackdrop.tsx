'use client';
// Night-sky wash + star particles while the stargazing demo chip is active.
import SceneFX from './SceneFX';

export default function WatchingStarsBackdrop({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      data-testid="watching-stars-backdrop"
      className="pointer-events-none fixed inset-0 z-[4] overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#050818] via-[#0a1030] to-[#02040a]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(90,110,200,0.38),transparent_55%)]" />
      <SceneFX fx="stars" className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
    </div>
  );
}
/**
 * Silencio-2 optional EN emotion/SFX CPU sidecar flag.
 * Default OFF. Never routes zh/Yue. Never code-switches with Edge Cantonese.
 * Not wired into freeVoiceHops / speak() in this spike — flag is documentation + future gate only.
 */
export function isSilencio2Enabled(): boolean {
  if (typeof process === 'undefined') return false;
  const raw = process.env.NEXT_PUBLIC_AMOJI_SILENCIO2;
  return raw === '1' || raw === 'true';
}

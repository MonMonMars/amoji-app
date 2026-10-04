'use client';
// The human's display name — entered once on the login page, kept on-device.
// r2026-10-04.70: optional self-described gender — drives warm-vs-mate tone
// in the adaptive dialogue. Default 'secret' = never mentioned to the brain,
// so existing users keep exactly the behaviour they had before.
const KEY = 'amoji.profile.v1';

export type Gender = 'male' | 'female' | 'secret';

export interface Profile {
  name: string;
  gender?: Gender;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      if (p && typeof p.name === 'string') {
        const gender: Gender = p.gender === 'male' || p.gender === 'female' ? p.gender : 'secret';
        return { name: p.name.trim(), gender };
      }
    }
  } catch { /* ignore */ }
  return { name: '', gender: 'secret' };
}

export function saveProfile(p: Profile): void {
  const gender: Gender = p.gender === 'male' || p.gender === 'female' ? p.gender : 'secret';
  try { localStorage.setItem(KEY, JSON.stringify({ name: p.name.trim(), gender })); } catch { /* ignore */ }
}

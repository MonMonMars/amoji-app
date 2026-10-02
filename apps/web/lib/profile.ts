'use client';
// The human's display name — entered once on the login page, kept on-device.
const KEY = 'amoji.profile.v1';

export interface Profile {
  name: string;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      if (p && typeof p.name === 'string') return { name: p.name.trim() };
    }
  } catch { /* ignore */ }
  return { name: '' };
}

export function saveProfile(p: Profile): void {
  try { localStorage.setItem(KEY, JSON.stringify({ name: p.name.trim() })); } catch { /* ignore */ }
}

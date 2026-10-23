'use client';
// Startup selection page — 2D bighead and scene cards (SelectionBoard).
// START saves prefs and opens /chat, which loads the chosen character.
import SelectionBoard from '../../components/SelectionBoard';

export default function Select() {
  return <SelectionBoard mode="start" />;
}

'use client';
// Startup selection page — 2D bighead and scene cards (SelectionBoard).
// START saves prefs and opens /chat, which loads the chosen character.
// The 18+ / audio gate is answered first: RequireEntryGate renders the gate
// INSTEAD of this board, so the cast never loads and no greeting plays before
// the user has confirmed they are an adult and can hear her.
import SelectionBoard from '../../components/SelectionBoard';
import RequireEntryGate from '../../components/RequireEntryGate';

export default function Select() {
  return (
    <RequireEntryGate>
      <SelectionBoard mode="start" />
    </RequireEntryGate>
  );
}

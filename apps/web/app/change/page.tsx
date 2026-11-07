'use client';
// In-chat change page ??same 2D board as /select. Picks stay a draft until
// Change writes prefs and opens /chat, which loads the chosen character.
// Reached from the chat room's name plate. Gate-guarded like /select.
import SelectionBoard from '../../components/SelectionBoard';
import RequireEntryGate from '../../components/RequireEntryGate';

export default function Change() {
  return (
    <RequireEntryGate>
      <SelectionBoard mode="change" />
    </RequireEntryGate>
  );
}

'use client';
// In-chat change page — same 2D board as /select. Picks stay a draft until
// Change writes prefs and opens /chat, which loads the chosen character.
// Reached from the chat room's name plate.
import SelectionBoard from '../../components/SelectionBoard';

export default function Change() {
  return <SelectionBoard mode="change" />;
}

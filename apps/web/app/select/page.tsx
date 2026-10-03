'use client';
// Startup selection page — renders the shared SelectionBoard (mode 'start').
// The in-chat variant lives at /change; both stay in sync by sharing the board.
import SelectionBoard from '../../components/SelectionBoard';

export default function Select() {
  return <SelectionBoard mode="start" />;
}

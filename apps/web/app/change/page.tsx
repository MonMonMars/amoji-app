'use client';
// In-chat change page — same board as /select, but draft-based: the preview
// keeps the existing character/scene/language until new ones are picked, and
// the bottom button says "Change". Reached from the chat room's name plate.
import SelectionBoard from '../../components/SelectionBoard';

export default function Change() {
  return <SelectionBoard mode="change" />;
}

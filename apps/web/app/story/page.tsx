'use client';
// Legacy /story URL — mode chips live on /select now (in-place). Soft-land on select story board.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    try { sessionStorage.setItem('amoji.selectMode', 'story'); } catch { /* ignore */ }
    router.replace('/select');
  }, [router]);
  return null;
}

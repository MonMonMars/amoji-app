'use client';
// Legacy /mode URL — mode chips live on /select now (in-place chat/story/kid).
// Soft-land so Pages bookmarks + old SW shells do not 404 after #103 removed /mode.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ModeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/select');
  }, [router]);
  return null;
}
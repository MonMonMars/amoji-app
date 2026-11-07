'use client';
// /setup redirect — mode chips live on /select (in-place chat/story).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Setup() {
  const router = useRouter();
  useEffect(() => { router.replace('/select'); }, [router]);
  return null;
}

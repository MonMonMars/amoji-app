'use client';
// /setup used to be the multi-step setup — it moved to the one-page /select.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Setup() {
  const router = useRouter();
  useEffect(() => { router.replace('/select'); }, [router]);
  return null;
}

'use client';
// /setup used to be the multi-step setup — it moved to /mode (Chat vs Story), then /select or /story.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Setup() {
  const router = useRouter();
  useEffect(() => { router.replace('/mode'); }, [router]);
  return null;
}

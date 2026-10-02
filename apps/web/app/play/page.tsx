'use client';
// /play used to be the chat room — it moved to /chat.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Play() {
  const router = useRouter();
  useEffect(() => { router.replace('/chat'); }, [router]);
  return null;
}

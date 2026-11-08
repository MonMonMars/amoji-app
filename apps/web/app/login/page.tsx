'use client';
// Login merged into title one-tap START — keep /login as a stable redirect.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return (
    <main className="min-h-dvh bg-neutral-950" aria-busy="true" data-testid="login-redirect" />
  );
}

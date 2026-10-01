'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import ChatPanel from '../../components/ChatPanel';
import DevPanel from '../../components/DevPanel';
import FallbackNotice from '../../components/FallbackNotice';

const CompanionCanvas = dynamic(() => import('../../components/CompanionCanvas'), { ssr: false });

export default function Play() {
  const [notice, setNotice] = useState<{ reason: 'webgl' | 'asset' } | null>(null);
  const [dev, setDev] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`') setDev((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-neutral-900 text-white">
      <CompanionCanvas onNotice={setNotice} />
      {notice && <FallbackNotice reason={notice.reason} />}
      {dev && <DevPanel />}
      <div className="absolute inset-x-0 bottom-0">
        <ChatPanel />
      </div>
    </main>
  );
}

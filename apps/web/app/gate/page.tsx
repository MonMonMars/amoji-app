'use client';
import { useRouter } from 'next/navigation';
import QuickSetup from '../../components/QuickSetup';

export default function Gate() {
  const router = useRouter();
  return <QuickSetup onDone={() => router.replace('/select')} />;
}

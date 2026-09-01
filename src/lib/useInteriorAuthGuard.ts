'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isInteriorSession } from '@/lib/interiorAuth';

export function useInteriorAuthGuard() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hasInterior = isInteriorSession();
    const token = localStorage.getItem('token') || localStorage.getItem('interiorAccessToken');

    if (!hasInterior) {
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }
    Promise.resolve().then(() => setChecked(true));
  }, [router]);

  return checked;
}

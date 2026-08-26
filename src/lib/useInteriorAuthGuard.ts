'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useInteriorAuthGuard() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('interiorAccessToken');
    if (!token) {
      router.replace('/login');
      return;
    }
    Promise.resolve().then(() => setChecked(true));
  }, [router]);

  return checked;
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isInteriorSession } from '@/lib/interiorAuth';
import { ensureFreshInteriorUser } from '@/features/interior-new/hooks/usePermissions';

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
    // Render only after the user's current permissions are loaded (instant after
    // the first page of this visit), so a refresh never shows the saved ones
    let alive = true;
    ensureFreshInteriorUser().then(() => {
      if (alive) setChecked(true);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  return checked;
}

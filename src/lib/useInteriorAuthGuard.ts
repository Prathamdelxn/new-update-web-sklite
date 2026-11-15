'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isInteriorSession } from '@/lib/interiorAuth';
import { ensureFreshInteriorUser } from '@/features/interior-new/hooks/usePermissions';

let isVerifiedInSession = false;

export function useInteriorAuthGuard() {
  const router = useRouter();
  // Safe SSR initialization: during initial hydration, isVerifiedInSession is false on both server and client.
  // On client-side page transitions, isVerifiedInSession is already true, preventing screen flash.
  const [checked, setChecked] = useState(() => isVerifiedInSession);

  useEffect(() => {
    const hasInterior = isInteriorSession();
    const token = localStorage.getItem('token') || localStorage.getItem('interiorAccessToken');

    if (!hasInterior) {
      isVerifiedInSession = false;
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    isVerifiedInSession = true;
    setChecked(true);

    let alive = true;
    ensureFreshInteriorUser().then(() => {
      if (alive) {
        // Permissions refreshed
      }
    });
    return () => {
      alive = false;
    };
  }, [router]);

  return checked;
}

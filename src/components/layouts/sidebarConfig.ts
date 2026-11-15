'use client';

import { useState, useEffect } from 'react';

export const SIDEBAR_EXPANDED_WIDTH = 295;
export const SIDEBAR_COLLAPSED_WIDTH = 76;

// Snappy, modern easing for sidebar toggle
export const SIDEBAR_TRANSITION = {
  duration: 0.25,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

// ── In-Memory Cache (Persists across client-side page / tab transitions) ──
let cachedSidebarCollapsed: boolean | null = null;
let cachedIsDesktop: boolean | null = null;

export function getCachedSidebarCollapsed(): boolean {
  if (cachedSidebarCollapsed !== null) return cachedSidebarCollapsed;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      if (stored !== null) {
        cachedSidebarCollapsed = stored === 'true';
        return cachedSidebarCollapsed;
      }
    } catch {}
  }
  return false;
}

export function setCachedSidebarCollapsed(collapsed: boolean): void {
  cachedSidebarCollapsed = collapsed;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sidebar-collapsed', String(collapsed));
    } catch {}
  }
}

export function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (cachedIsDesktop !== null) return cachedIsDesktop;
    if (typeof window !== 'undefined') {
      const match = window.matchMedia(`(min-width: ${breakpoint}px)`).matches;
      cachedIsDesktop = match;
      return match;
    }
    return true; // Assume desktop by default for dashboard layout
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(`(min-width: ${breakpoint}px)`);
    cachedIsDesktop = media.matches;
    setIsDesktop(media.matches);

    const handler = (e: MediaQueryListEvent) => {
      cachedIsDesktop = e.matches;
      setIsDesktop(e.matches);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [breakpoint]);

  return isDesktop;
}

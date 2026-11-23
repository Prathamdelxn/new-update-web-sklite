'use client';

// Opens a specific record when a page is reached from a link such as
// ".../procurement?po=<id>&do=grn" (used by the "What needs doing" list).
// Runs once, after the page's data is ready, then removes the params from the
// URL so closing the dialog / going back doesn't reopen it.

import { useEffect, useRef } from 'react';

export function useDeepLinkParams(
  keys: string[],
  ready: boolean,
  onParams: (params: Record<string, string>) => void
) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !ready || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const found: Record<string, string> = {};
    for (const k of keys) {
      const v = url.searchParams.get(k);
      if (v) found[k] = v;
    }
    done.current = true;
    if (!Object.keys(found).length) return;
    for (const k of keys) url.searchParams.delete(k);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    onParams(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}

// =============================================================================
// Sky-Lite Web — Interior API on the SERVER (for server-rendered pages)
//
// Import only from Server Components / route handlers. Reads the login token
// from the `interiorAccessToken` cookie (written at login and on token refresh)
// and calls the interior backend directly, so a page can arrive with its data.
//
// Failure is always soft: no cookie, an expired token, an error or a slow
// backend just returns null — the page then loads that data in the browser
// exactly as before. Server rendering is a speed-up, never a new failure mode.
// =============================================================================

import { cookies } from 'next/headers';
import { QueryClient, dehydrate, type DehydratedState } from '@tanstack/react-query';

const API_BASE = `${(process.env.NEXT_PUBLIC_INTERIOR_API_URL || 'http://localhost:3002').replace(/\/+$/, '')}/api/v1`;

/** Give up and let the browser load the data if the backend is slower than this. */
const SERVER_FETCH_TIMEOUT_MS = 4000;

export async function getServerAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get('interiorAccessToken')?.value || store.get('token')?.value || null;
}

export interface ServerResult<T> {
  status: number;
  body: T | null;
}

/** GET an interior API path on the server. Returns null when it can't (no token, timeout, network). */
export async function serverGet<T = any>(path: string): Promise<ServerResult<T> | null> {
  const token = await getServerAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return null;
  }
}

/** GET a PUBLIC interior API path (no login, e.g. share links). Null on timeout/network error. */
export async function serverPublicGet<T = any>(path: string): Promise<ServerResult<T> | null> {
  try {
    const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return null;
  }
}

export type Prefetch =
  | {
      /** Must match the queryKey the client component uses. */
      key: readonly unknown[];
      path: string;
      /**
       * Turn the API response into exactly what the client's queryFn returns.
       * Return undefined to skip (the browser will fetch it instead).
       */
      select: (r: ServerResult<any>) => unknown | undefined;
    }
  | {
      key: readonly unknown[];
      /** For queries that combine several calls: build the same value the client's queryFn returns. */
      load: () => Promise<unknown | undefined>;
    };

/** Unwrap the backend's `{ success, data }` envelope (or a bare array). */
export const dataOf = (r: ServerResult<any> | null): any =>
  r && r.status < 400 ? (r.body?.success && r.body?.data !== undefined ? r.body.data : Array.isArray(r.body) ? r.body : undefined) : undefined;

/**
 * Run the given API calls in parallel on the server and return a dehydrated
 * TanStack Query cache for <HydrationBoundary>. Anything that fails is simply
 * left out, so the client falls back to fetching it.
 */
export async function prefetchQueries(prefetches: Prefetch[]): Promise<DehydratedState> {
  const qc = new QueryClient();
  await Promise.all(
    prefetches.map(async (p) => {
      let value: unknown;
      if ('load' in p) {
        value = await p.load().catch(() => undefined);
      } else {
        const r = await serverGet(p.path);
        if (!r || r.status === 401) return;
        value = p.select(r);
      }
      if (value !== undefined) qc.setQueryData(p.key, value);
    })
  );
  return dehydrate(qc);
}

import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { markForbidden } from '@/lib/permissionErrors';

const baseURL = typeof window === 'undefined'
  ? process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Short cache for a project's sub-data (issues, milestones, materials, …) ──────────────
// Every project tab re-fetched its data on each switch. GETs of `/projects/<id>/<anything>`
// are now reused for 20s and identical in-flight requests are shared. Any change (POST/PUT/
// PATCH/DELETE) clears the cache, and so does every live socket update (useProjectSocket),
// so a save or another user's change is never hidden. The project itself and the project
// list are cached separately by React Query.
const SUBDATA_TTL_MS = 20_000;
const subdataCache = new Map<string, { at: number; res: AxiosResponse }>();
const inflight = new Map<string, Promise<AxiosResponse>>();

/** Drop all cached project sub-data (after a change, a live update, or logout). */
export const clearApiCache = () => subdataCache.clear();

const baseAdapter = axios.getAdapter(axios.defaults.adapter);
const isSubdataGet = (config: InternalAxiosRequestConfig) =>
  (config.method || 'get').toLowerCase() === 'get' &&
  (!config.responseType || config.responseType === 'json') &&
  /^\/projects\/[^/?]+\/[^?]/.test(config.url || '');

api.defaults.adapter = async (config) => {
  if (!isSubdataGet(config)) {
    const isChange = (config.method || 'get').toLowerCase() !== 'get';
    if (isChange) clearApiCache();
    try {
      return await baseAdapter(config);
    } finally {
      if (isChange) clearApiCache(); // also drop anything fetched while the change was in flight
    }
  }

  const auth = String(config.headers?.Authorization || '');
  const key = `${auth.slice(-24)} ${config.url} ${JSON.stringify(config.params || {})}`;
  const hit = subdataCache.get(key);
  // Each caller gets its own copy, so a component sorting/mutating data can't affect another
  if (hit && Date.now() - hit.at < SUBDATA_TTL_MS) return { ...hit.res, data: structuredClone(hit.res.data), config };

  let pending = inflight.get(key);
  if (!pending) {
    pending = baseAdapter(config)
      .then((res) => {
        subdataCache.set(key, { at: Date.now(), res });
        return res;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  const res = await pending;
  return { ...res, data: structuredClone(res.data), config };
};


const publicAuthPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
  '/superadmin/auth/login',
  '/superadmin/auth/logout',
];

const isPublicAuthRoute = (url?: string) => {
  if (!url) return false;
  return publicAuthPaths.some((path) => url.startsWith(path));
};

// Request interceptor to attach token
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      const rawUrl = config.url || '';
      if (isPublicAuthRoute(rawUrl)) {
        return config;
      }

      const isSuperAdminApi = rawUrl.startsWith('/superadmin');
      if (isSuperAdminApi) {
        config.withCredentials = true;
      }

      const token = isSuperAdminApi
        ? sessionStorage.getItem('saToken')
        : localStorage.getItem('token') || Cookies.get('token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Lets the toast layer show "no permission" instead of a generic failure
    if (error.response?.status === 403) markForbidden();

    const originalRequest = error.config;
    const originalUrl = originalRequest?.url;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicAuthRoute(originalUrl)
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        // Super Admin doesn't use refresh token
        const isSuperAdmin = !!localStorage.getItem('saToken');

        if (!refreshToken) {
          if (isSuperAdmin) {
            return Promise.reject(error);
          }

          throw new Error('No refresh token');
        }

        const response = await axios.post('/api/auth/refresh', {
          refreshToken,
        });

        const { token } = response.data;
        localStorage.setItem('token', token);
        Cookies.set('token', token, { expires: 7 }); // Sync cookie

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed — clear regular user session
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          Cookies.remove('token');
          // Don't redirect if already on /login or if a superadmin session is active
          const onLoginPage = window.location.pathname === '/login';
          const hasSaToken = !!localStorage.getItem('saToken');
          if (!onLoginPage && !hasSaToken) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
// trigger reload

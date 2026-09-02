// =============================================================================
// Sky-Lite Web — Interior-OS Auth Helper
// Authenticates directly against the interior-os backend, storing its session
// under `interior*` localStorage keys so it never collides with the
// construction flow's `token`/`refreshToken`/`user` keys.
// =============================================================================

import Cookies from 'js-cookie';
import interiorApiClient from '@/services/interiorApi.client';

function persistInteriorSession(user: any, organization: any, tokens: { accessToken: string; refreshToken: string }) {
  localStorage.setItem('interiorAccessToken', tokens.accessToken);
  localStorage.setItem('interiorRefreshToken', tokens.refreshToken);
  localStorage.setItem('interiorUser', JSON.stringify(user));
  localStorage.setItem('interiorOrganization', JSON.stringify(organization));
  Cookies.set('token', tokens.accessToken, { expires: 7 });
  Cookies.set('interiorAccessToken', tokens.accessToken, { expires: 7 });
  Cookies.set('industryType', 'interior', { expires: 7 });
}

export async function loginInterior(email: string, password: string) {
  const response = await interiorApiClient.post('/auth/login', { email, password });
  const { user, organization, tokens } = response.data.data;
  persistInteriorSession(user, organization, tokens);
  return { user, organization };
}

export interface InteriorSignupPayload {
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function signupInterior(payload: InteriorSignupPayload) {
  const response = await interiorApiClient.post('/auth/signup', payload);
  return response.data;
}

export async function verifyInteriorEmail(email: string, otp: string) {
  const response = await interiorApiClient.post('/auth/verify-email', { email, otp });
  const { user, organization, tokens } = response.data.data;
  persistInteriorSession(user, organization, tokens);
  return { user, organization };
}

export function logoutInterior() {
  localStorage.removeItem('interiorAccessToken');
  localStorage.removeItem('interiorRefreshToken');
  localStorage.removeItem('interiorUser');
  localStorage.removeItem('interiorOrganization');
  Cookies.remove('token');
  Cookies.remove('token', { path: '/' });
  Cookies.remove('interiorAccessToken');
  Cookies.remove('interiorAccessToken', { path: '/' });
  Cookies.remove('industryType');
  Cookies.remove('industryType', { path: '/' });
}

export function getInteriorUser() {
  const saved = localStorage.getItem('interiorUser');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function isInteriorSession(): boolean {
  if (typeof window === 'undefined') return false;
  const interiorToken = localStorage.getItem('interiorAccessToken');
  const interiorUser = localStorage.getItem('interiorUser');
  if (interiorToken && interiorUser) return true;

  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed?.industryType === 'interior' || parsed?.organization?.industryType === 'interior') {
        return true;
      }
    } catch {}
  }
  return false;
}

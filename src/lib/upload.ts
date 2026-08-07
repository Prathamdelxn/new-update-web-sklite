import CryptoJS from 'crypto-js';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const API_KEY    = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;
const API_SECRET = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET!;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const FOLDER     = 'skylite';

// `crypto.subtle` (Web Crypto API) only exists in secure contexts (HTTPS or
// localhost) — this dev setup is tested over plain-HTTP LAN IPs
// (see allowedDevOrigins in next.config.ts), where it's undefined and throws.
// crypto-js hashes in pure JS, so it works regardless of the page's origin.
function sha1(str: string): string {
  return CryptoJS.SHA1(str).toString();
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = sha1(`folder=${FOLDER}&timestamp=${timestamp}${API_SECRET}`);

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', FOLDER);

  const res = await fetch(UPLOAD_URL, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Upload failed');
  }
  const data = await res.json();
  return data.secure_url as string;
}

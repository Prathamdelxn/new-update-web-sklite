const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const API_KEY    = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;
const API_SECRET = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET!;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const FOLDER     = 'skylite';

async function sha1(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = await sha1(`folder=${FOLDER}&timestamp=${timestamp}${API_SECRET}`);

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

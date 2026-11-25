// Public share link — server-rendered: the portfolio is loaded on the server so the page
// (and WhatsApp / e-mail link previews) arrive with the client's name and drawings.
import { cache } from 'react';
import type { Metadata } from 'next';
import { serverPublicGet } from '@/lib/server/interiorServerApi';
import ShareDrawingClient from './ShareDrawingClient';

// One request per render: shared by generateMetadata and the page
const loadPortfolio = cache(async (token: string) => {
  const r = await serverPublicGet(`/public/crm/${encodeURIComponent(token)}`);
  return r && r.status < 400 && r.body?.success && r.body?.data ? r.body.data : null;
});

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await loadPortfolio(token);
  const name = data?.lead?.name;
  const title = name ? `${name} — Drawings Portfolio | SkyStruct Lite` : 'Drawings Portfolio | SkyStruct Lite';
  return {
    title,
    description: name ? `Design drawings shared with ${name}.` : 'Design drawings shared via SkyStruct Lite.',
    robots: { index: false, follow: false }, // private client links: never index
    openGraph: { title, type: 'website' },
  };
}

export default async function ClientDrawingSharePage({ params }: Props) {
  const { token } = await params;
  const data = await loadPortfolio(token);
  return <ShareDrawingClient token={token} initialData={data} />;
}

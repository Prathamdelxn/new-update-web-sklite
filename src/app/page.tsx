// Public landing page — server-rendered so search engines and link previews get the
// full content. Signed-in users are redirected on the server (from their session
// cookie) before any HTML is sent.
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingClient from './LandingClient';

export const metadata: Metadata = {
  title: 'SkyStruct Lite — Interior & Construction Project Management',
  description:
    'Run interior fit-out and construction projects in one place: CRM, BOQs, quotations, site progress, procurement, snags and handover — on web and mobile.',
  openGraph: {
    title: 'SkyStruct Lite — Interior & Construction Project Management',
    description: 'CRM, BOQs, quotations, site progress, procurement and handover for interior and construction teams.',
    type: 'website',
  },
};

export default async function LandingPage() {
  const store = await cookies();
  if (store.get('saToken')?.value) redirect('/superadmin/dashboard');
  if (store.get('interiorAccessToken')?.value || store.get('token')?.value) {
    redirect(store.get('industryType')?.value === 'interior' ? '/interior-new' : '/construction-dashboard');
  }
  return <LandingClient />;
}

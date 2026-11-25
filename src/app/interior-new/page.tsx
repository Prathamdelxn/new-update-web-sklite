// Server component: fetches the dashboard on the server and ships it with the page,
// so the view renders immediately in the browser without its own API round trip.
import { HydrationBoundary } from '@tanstack/react-query';
import { prefetchQueries } from '@/lib/server/interiorServerApi';
import DashboardClient from './DashboardClient';

export default async function InteriorNewPage() {
  const state = await prefetchQueries([
    {
      key: ['crm-stats-dashboard'], // same key as InteriorNewDashboardView's useQuery
      path: '/dashboard',
      select: (r) => (r.status === 403 ? { forbidden: true } : r.body?.success && r.body?.data ? r.body.data : undefined),
    },
  ]);

  return (
    <HydrationBoundary state={state}>
      <DashboardClient />
    </HydrationBoundary>
  );
}

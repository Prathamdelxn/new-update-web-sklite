// Server component: loads the CRM list on the server and ships it with the page.
import { HydrationBoundary } from '@tanstack/react-query';
import { dataOf, prefetchQueries, serverGet } from '@/lib/server/interiorServerApi';
import CrmClient from './CrmClient';

export default async function InteriorNewCrmPage() {
  const state = await prefetchQueries([
    {
      key: ['crm-leads-list'], // same key + shape as InteriorCrmView's useQuery
      load: async () => {
        const [leads, users, stats] = await Promise.all([
          serverGet('/crm/customers?all=true'),
          serverGet('/users'),
          serverGet('/crm/customers/stats'),
        ]);
        const leadList = dataOf(leads);
        if (leadList === undefined) return undefined; // let the browser load it
        return { leads: leadList, users: dataOf(users) || [], serverStats: dataOf(stats) || null };
      },
    },
  ]);

  return (
    <HydrationBoundary state={state}>
      <CrmClient />
    </HydrationBoundary>
  );
}

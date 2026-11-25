// Server component: loads the projects list on the server and ships it with the page.
import { HydrationBoundary } from '@tanstack/react-query';
import { dataOf, prefetchQueries } from '@/lib/server/interiorServerApi';
import ProjectsClient from './ProjectsClient';

export default async function InteriorNewProjectsPage() {
  const state = await prefetchQueries([
    {
      key: ['interior-projects-list'], // same key + shape as InteriorNewProjectsView's useQuery
      path: '/projects',
      select: (r) => dataOf(r),
    },
  ]);

  return (
    <HydrationBoundary state={state}>
      <ProjectsClient />
    </HydrationBoundary>
  );
}

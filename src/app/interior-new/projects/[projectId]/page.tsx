// Server component: loads the project's overview metrics on the server and ships them with the page.
import { HydrationBoundary } from '@tanstack/react-query';
import { dataOf, prefetchQueries } from '@/lib/server/interiorServerApi';
import InteriorProjectOverviewView from '@/features/interior-new/components/projects/InteriorProjectOverviewView';

export default async function InteriorProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const state = await prefetchQueries([
    {
      key: ['interior-project-metrics', projectId], // same key + shape as the view's useQuery
      path: `/projects/${encodeURIComponent(projectId)}/dashboard`,
      select: (r) => dataOf(r),
    },
  ]);

  return (
    <HydrationBoundary state={state}>
      <InteriorProjectOverviewView projectId={projectId} />
    </HydrationBoundary>
  );
}

import React from 'react';
import InteriorTimelineView from '@/features/interior-new/components/projects/InteriorTimelineView';

export default async function InteriorTimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = await params;
  return <InteriorTimelineView projectId={resolvedParams.projectId} />;
}

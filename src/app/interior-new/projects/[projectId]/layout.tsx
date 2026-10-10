'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { InteriorProjectBanner } from '@/components/interior/InteriorProjectBanner';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useQuery } from '@tanstack/react-query';

export default function InteriorProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.projectId as string;

  const isDrawingStudioPage = Boolean(
    pathname?.includes('/drawings/') &&
    pathname.split('/drawings/')[1]?.length > 0
  );

  const {
    data: project = null,
    isLoading: loading,
  } = useQuery({
    queryKey: ['interior-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await interiorProjectService.getProjectDetails(projectId);
      return res?.success && res?.data ? res.data : null;
    },
    enabled: Boolean(checked && projectId),
    staleTime: 5 * 60 * 1000,
  });

  if (!checked) return null;

  if (isDrawingStudioPage) {
    return (
      <InteriorShell>
        <div className="interior-os-theme flex flex-col min-h-screen">
          <div className="flex-1 bg-[hsl(var(--background))]">{children}</div>
        </div>
      </InteriorShell>
    );
  }

  return (
    <InteriorShell>
      <div className="interior-os-theme flex flex-col min-h-screen">
        <InteriorProjectBanner projectId={projectId} project={project} loading={loading} />
        <div className="flex-1 bg-[hsl(var(--background))]">{children}</div>
      </div>
    </InteriorShell>
  );
}

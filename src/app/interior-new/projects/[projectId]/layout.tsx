'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { InteriorProjectBanner } from '@/components/interior/InteriorProjectBanner';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { interiorProjectService } from '@/services/interiorProject.service';

export default function InteriorProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!checked || !projectId) return;
    setLoading(true);
    interiorProjectService
      .getProjectDetails(projectId)
      .then((res) => setProject(res?.success && res?.data ? res.data : null))
      .catch((err) => {
        console.error('Failed to load project details', err);
        setProject(null);
      })
      .finally(() => setLoading(false));
  }, [checked, projectId]);

  if (!checked) return null;

  return (
    <InteriorShell>
      <div className="interior-os-theme flex flex-col min-h-screen">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
          </div>
        ) : (
          <InteriorProjectBanner projectId={projectId} project={project} />
        )}
        <div className="flex-1 bg-[hsl(var(--background))]">{children}</div>
      </div>
    </InteriorShell>
  );
}

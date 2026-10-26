'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { InteriorProjectBanner } from '@/components/interior/InteriorProjectBanner';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { sectionFromPath, useCanOpenSection } from '@/features/interior-new/lib/projectSectionAccess';

// Shown instead of a project page the user can't view (opened by link or URL)
function NoSectionAccess({ projectId }: { projectId: string }) {
  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-md mx-auto mt-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center space-y-3">
        <ShieldOff className="w-9 h-9 mx-auto text-[hsl(var(--muted-foreground))]" />
        <h2 className="text-base font-bold text-[hsl(var(--foreground))]">No access to this section</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          You don&apos;t have permission to view this part of the project. Ask an admin to update your role if you need it.
        </p>
        <Link href={`/interior-new/projects/${projectId}`} className="inline-block text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
          Back to project
        </Link>
      </div>
    </div>
  );
}

export default function InteriorProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.projectId as string;

  // Every project page needs its section's View permission (the server enforces it
  // too; this replaces the empty / broken page with a clear message)
  const canOpen = useCanOpenSection(projectId);
  const section = sectionFromPath(pathname, projectId);
  const allowed = canOpen(section);
  // Wait for the role in this project before showing the page, so it never loads
  // (and keeps) data or buttons decided with no / old project permissions
  const page =
    allowed === null ? (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[hsl(var(--primary))]" />
      </div>
    ) : allowed === false ? (
      <NoSectionAccess projectId={projectId} />
    ) : (
      children
    );

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
          <div className="flex-1 bg-[hsl(var(--background))]">{page}</div>
        </div>
      </InteriorShell>
    );
  }

  return (
    <InteriorShell>
      <div className="interior-os-theme flex flex-col min-h-screen">
        <InteriorProjectBanner projectId={projectId} project={project} loading={loading} />
        <div className="flex-1 bg-[hsl(var(--background))]">{page}</div>
      </div>
    </InteriorShell>
  );
}

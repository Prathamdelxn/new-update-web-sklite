'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InteriorSidebar } from '@/components/interior/InteriorSidebar';
import { InteriorHeader } from '@/components/interior/InteriorHeader';
import { getInteriorUser, isInteriorSession } from '@/lib/interiorAuth';
import { useQueryClient } from '@tanstack/react-query';
import { ensureFreshInteriorUser, PERMISSIONS_CHANGED_EVENT } from '@/features/interior-new/hooks/usePermissions';

interface InteriorShellProps {
  children: React.ReactNode;
}

export function InteriorShell({ children }: InteriorShellProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getInteriorUser>>(null);
  const [organizationName, setOrganizationName] = useState<string | undefined>(undefined);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const queryClient = useQueryClient();
  // Bumped when an admin changes this user's permissions: the page re-mounts and
  // re-loads its data with the new access (no browser refresh needed)
  const [permissionsVersion, setPermissionsVersion] = useState(0);

  useEffect(() => {
    const onChange = () => {
      queryClient.invalidateQueries();
      setPermissionsVersion((v) => v + 1);
    };
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PERMISSIONS_CHANGED_EVENT, onChange);
  }, [queryClient]);

  useEffect(() => {
    const hasInterior = isInteriorSession();
    const token = localStorage.getItem('token') || localStorage.getItem('interiorAccessToken');

    if (!hasInterior) {
      if (token) {
        // User is logged in as a construction user, redirect to construction dashboard
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    let alive = true;
    // Show the page only with the user's current permissions (see ensureFreshInteriorUser)
    ensureFreshInteriorUser().then(() => {
      if (!alive) return;
      setIsAuthorized(true);
      setUser(getInteriorUser());
    });
    const org = localStorage.getItem('interiorOrganization');
    if (org) {
      try {
        setOrganizationName(JSON.parse(org)?.name);
      } catch {
        // ignore malformed cache
      }
    }
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
    return () => {
      alive = false;
    };
  }, [router]);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  if (!isAuthorized) {
    return (
      <div className="interior-os-theme min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="interior-os-theme min-h-screen bg-[hsl(var(--background))] flex">
      <InteriorSidebar
        organizationName={organizationName}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <InteriorHeader user={user} onMobileMenuClick={() => setMobileOpen(true)} />
        <main key={permissionsVersion} className="flex-1">{children}</main>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InteriorSidebar } from '@/components/interior/InteriorSidebar';
import { InteriorHeader } from '@/components/interior/InteriorHeader';
import { getInteriorUser, isInteriorSession } from '@/lib/interiorAuth';

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

    setIsAuthorized(true);
    setUser(getInteriorUser());
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
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { InteriorSidebar } from '@/components/interior/InteriorSidebar';
import { InteriorHeader } from '@/components/interior/InteriorHeader';
import { getInteriorUser, isInteriorSession } from '@/lib/interiorAuth';
import { useQueryClient } from '@tanstack/react-query';
import { ensureFreshInteriorUser, PERMISSIONS_CHANGED_EVENT } from '@/features/interior-new/hooks/usePermissions';
import {
  getCachedSidebarCollapsed,
  setCachedSidebarCollapsed,
} from '@/components/layouts/sidebarConfig';

interface InteriorShellProps {
  children: React.ReactNode;
}

let isVerifiedInSession = false;

export function InteriorShell({ children }: InteriorShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read initial collapsed state from in-memory cache to prevent open-then-shrink animation glitch on tab switch
  const [collapsed, setCollapsed] = useState<boolean>(getCachedSidebarCollapsed);

  const [user, setUser] = useState<ReturnType<typeof getInteriorUser>>(null);
  const [organizationName, setOrganizationName] = useState<string | undefined>(undefined);
  // Safe SSR initialization: during initial hydration, matches server output perfectly.
  const [isAuthorized, setIsAuthorized] = useState(() => isVerifiedInSession);
  const queryClient = useQueryClient();
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
      isVerifiedInSession = false;
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    isVerifiedInSession = true;
    setIsAuthorized(true);
    setUser(getInteriorUser());

    let alive = true;
    ensureFreshInteriorUser().then(() => {
      if (!alive) return;
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
    if (stored !== null) {
      const isCol = stored === 'true';
      setCachedSidebarCollapsed(isCol);
      setCollapsed(isCol);
    }

    return () => {
      alive = false;
    };
  }, [router]);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      setCachedSidebarCollapsed(next);
      return next;
    });
  };

  if (!isAuthorized) {
    return (
      <div className="interior-os-theme fixed inset-0 flex h-screen h-dvh w-full bg-[#F8FAFF] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="interior-os-theme fixed inset-0 flex h-screen h-dvh w-full bg-[#F8FAFF] overflow-hidden">
      {/* ── 1. Static Sidebar (Locked on the left, never scrolls with page) ── */}
      <InteriorSidebar
        organizationName={organizationName}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* ── 2. Main Content Column (Only <main> scrolls internally) ── */}
      <div className="flex-1 min-w-0 flex flex-col h-screen h-dvh overflow-hidden">
        <InteriorHeader user={user} onMobileMenuClick={() => setMobileOpen(true)} />
        <main
          key={`${pathname}-${permissionsVersion}`}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full min-h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

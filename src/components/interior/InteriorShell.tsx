'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { InteriorSidebar } from '@/components/interior/InteriorSidebar';
import { InteriorHeader } from '@/components/interior/InteriorHeader';
import { getInteriorUser, isInteriorSession } from '@/lib/interiorAuth';
import { useQueryClient } from '@tanstack/react-query';
import { I18nProvider } from '@/i18n/I18nProvider';
import { ensureFreshInteriorUser, PERMISSIONS_CHANGED_EVENT } from '@/features/interior-new/hooks/usePermissions';
import {
  getCachedSidebarCollapsed,
  setCachedSidebarCollapsed,
} from '@/components/layouts/sidebarConfig';

interface InteriorShellProps {
  children: React.ReactNode;
}

let isVerifiedInSession = false;
// Kept across page navigations (each page mounts its own shell) so the sidebar org name and
// header user don't flash "Workspace" / blank on every tab change. Only set on the client, and
// only used once the session is verified, so the server render (spinner) is unaffected.
let cachedOrgName: string | undefined;
let cachedUser: ReturnType<typeof getInteriorUser> = null;

// English / Arabic for the whole interior app (language switch + right-to-left)
export function InteriorShell({ children }: InteriorShellProps) {
  return (
    <I18nProvider>
      <InteriorShellInner>{children}</InteriorShellInner>
    </I18nProvider>
  );
}

function InteriorShellInner({ children }: InteriorShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read initial collapsed state from in-memory cache to prevent open-then-shrink animation glitch on tab switch
  const [collapsed, setCollapsed] = useState<boolean>(getCachedSidebarCollapsed);

  const [user, setUser] = useState<ReturnType<typeof getInteriorUser>>(() => (isVerifiedInSession ? cachedUser : null));
  const [organizationName, setOrganizationName] = useState<string | undefined>(() => (isVerifiedInSession ? cachedOrgName : undefined));
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
      cachedOrgName = undefined;
      cachedUser = null;
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
      return;
    }

    isVerifiedInSession = true;
    setIsAuthorized(true);
    cachedUser = getInteriorUser();
    setUser(cachedUser);

    let alive = true;
    ensureFreshInteriorUser().then(() => {
      if (!alive) return;
      cachedUser = getInteriorUser();
      setUser(cachedUser);
    });

    const org = localStorage.getItem('interiorOrganization');
    if (org) {
      try {
        cachedOrgName = JSON.parse(org)?.name;
        setOrganizationName(cachedOrgName);
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

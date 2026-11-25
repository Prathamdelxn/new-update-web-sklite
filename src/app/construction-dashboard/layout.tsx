'use client';
import { tr } from '@/i18n';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layouts/Sidebar';
import { Topnav } from '@/components/layouts/Topnav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { isInteriorSession } from '@/lib/interiorAuth';
import { I18nProvider } from '@/i18n/I18nProvider';

// English / Arabic for the construction workspace (same switch as interior)
export default function ConstructionDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ConstructionDashboardLayoutInner>{children}</ConstructionDashboardLayoutInner>
    </I18nProvider>
  );
}

function ConstructionDashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  // Only <main> scrolls now, so reset it on navigation (the browser used to reset the window)
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior' ||
    isInteriorSession();

  useEffect(() => {
    if (!loading && isInterior) {
      router.replace('/interior-new');
    }
  }, [loading, isInterior, router]);

  // Load initial collapsed state on client side
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const nextVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(nextVal));
      return nextVal;
    });
  };

  if (loading || isInterior) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm font-medium text-slate-500">
            {isInterior ? tr("Redirecting to Interior Workspace...") : tr("Loading Workspace...")}
          </p>
        </div>
      </div>
    );
  }

  // App-style frame (same as interior): the window never scrolls — header and sidebar
  // stay put and only <main> scrolls. Padding uses logical `ps-`, so Arabic (RTL) mirrors.
  return (
    <div className="h-screen h-dvh w-full overflow-hidden bg-[#F8FAFF]">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div
        className={cn(
          "flex flex-col h-full w-full min-w-0 transition-[padding] duration-200",
          isCollapsed ? "lg:ps-[60px]" : "lg:ps-[260px]"
        )}
      >
        <Topnav onMenuClick={() => setIsSidebarOpen(true)} />

        <main ref={mainRef} className="flex-1 min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden px-4 md:px-6 pt-6 pb-8">
          <div className="w-full">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

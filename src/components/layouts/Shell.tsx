'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layouts/Sidebar';
import { Topnav } from '@/components/layouts/Topnav';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { isInteriorSession } from '@/lib/interiorAuth';

interface ShellProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children, headerContent }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior' ||
    isInteriorSession();

  useEffect(() => {
    if (!loading && isInterior) {
      if (pathname?.startsWith('/projects') || pathname?.startsWith('/construction-dashboard/projects')) {
        router.replace('/interior-new/projects');
      } else if (pathname?.startsWith('/users') || pathname?.startsWith('/construction-dashboard/users')) {
        router.replace('/interior-new/users-roles');
      } else if (pathname?.startsWith('/settings') || pathname?.startsWith('/construction-dashboard/settings')) {
        router.replace('/interior-new/settings');
      } else if (pathname?.startsWith('/profile') || pathname?.startsWith('/construction-dashboard/profile')) {
        router.replace('/interior-new/profile');
      } else {
        router.replace('/interior-new');
      }
    }
  }, [loading, isInterior, pathname, router]);

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

  if (isInterior) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm font-medium text-slate-500">Redirecting to Interior Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFF] overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      
      <div 
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300",
          isCollapsed ? "lg:pl-[60px]" : "lg:pl-[260px]"
        )}
      >
        <Topnav 
          onMenuClick={() => setIsSidebarOpen(true)} 
          isSidebarCollapsed={isCollapsed}
          headerContent={headerContent}
        />
        
        <main className="flex-1 min-w-0 px-4 md:px-8 pb-8 pt-20">
          <div className="max-w-7xl mx-auto">
            {/* No per-route fade/remount: it re-animated (and rebuilt) the project
                header and tab bar on every tab click */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

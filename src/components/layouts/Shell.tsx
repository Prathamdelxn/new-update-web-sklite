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
      if (pathname?.startsWith('/projects')) {
        router.replace('/interior-new/projects');
      } else if (pathname?.startsWith('/users')) {
        router.replace('/interior-new/users-roles');
      } else if (pathname?.startsWith('/settings')) {
        router.replace('/interior-new/settings');
      } else if (pathname?.startsWith('/profile')) {
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
    <div className="min-h-screen bg-[#F8FAFF]">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      
      <div 
        className={`${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'
        } flex flex-col min-h-screen transition-all duration-300`}
      >
        <Topnav 
          onMenuClick={() => setIsSidebarOpen(true)} 
          isSidebarCollapsed={isCollapsed}
          headerContent={headerContent}
        />
        
        <main className={cn(
          "flex-1 px-4 md:px-8 pb-8 transition-all duration-300",
          pathname === '/projects' ? "pt-12" : "pt-24"
        )}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

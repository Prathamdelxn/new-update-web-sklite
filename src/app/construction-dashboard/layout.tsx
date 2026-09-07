'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layouts/Sidebar';
import { Topnav } from '@/components/layouts/Topnav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { isInteriorSession } from '@/lib/interiorAuth';

export default function ConstructionDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            {isInterior ? 'Redirecting to Interior Workspace...' : 'Loading Workspace...'}
          </p>
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
        className={cn(
          "flex flex-col min-h-screen transition-all duration-200",
          isCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
        )}
      >
        <Topnav 
          onMenuClick={() => setIsSidebarOpen(true)} 
          isSidebarCollapsed={isCollapsed}
        />
        
        <main className="flex-1 px-4 md:px-6 pt-20 pb-8">
          <div className="max-w-[1680px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
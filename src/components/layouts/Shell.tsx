'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layouts/Sidebar';
import { Topnav } from '@/components/layouts/Topnav';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children, headerContent }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

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
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        } flex flex-col min-h-screen transition-all duration-300`}
      >
        <Topnav 
          onMenuClick={() => setIsSidebarOpen(true)} 
          isSidebarCollapsed={isCollapsed}
          headerContent={headerContent}
        />
        
        <main className={cn(
          "flex-1 px-4 md:px-8 pb-8 transition-all duration-300",
          pathname === '/projects' ? "pt-12" : "pt-20"
        )}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

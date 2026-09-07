'use client';
 
import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/providers/AuthContext';
import {GlobalSearch} from '@/components/shared/GlobalSearch';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
 
interface TopnavProps {
  onMenuClick: () => void;
  isSidebarCollapsed?: boolean;
  headerContent?: React.ReactNode;
}
 
export const Topnav: React.FC<TopnavProps> = ({ onMenuClick, isSidebarCollapsed, headerContent }) => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';
 
  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  const showSearch = !pathname.startsWith('/projects') && !pathname.startsWith('/construction-dashboard/projects');

  const isProjectsListPage = pathname === '/projects' || pathname === '/construction-dashboard/projects';
  const isProjectDetailPage =
    (pathname.startsWith('/projects/') && pathname !== '/projects') ||
    (pathname.startsWith('/construction-dashboard/projects/') && pathname !== '/construction-dashboard/projects');

  return (
    <header className={cn(
      "fixed top-0 right-0 left-0 z-30 h-15 bg-white border-b border-slate-200/80 shadow-2xs transition-all duration-200",
      isSidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[260px]'
    )}>
      <div className="h-full px-4 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

         
        </div>
 
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
          <div className="hidden sm:block">
            <NotificationCenter />
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
 
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-2xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs truncate w-[100px] font-bold text-slate-900 leading-tight">{user?.name || 'User'}</p>
                <p className="text-[10px]  font-semibold text-slate-500 leading-tight">
                  {user?.role?.name || 'Member'}
                </p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", showMenu && "rotate-180")} />
            </button>
 
            {showMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
               
                <button
                  onClick={() => { setShowMenu(false); logout(); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
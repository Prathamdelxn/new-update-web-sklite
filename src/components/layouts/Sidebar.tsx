'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Users, Settings, X, Layers,
  ChevronLeft, ChevronRight, Sparkles, UserCheck, FolderKanban, UserCog,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Projects',  href: '/projects',  icon: Briefcase },
    ],
  },
  {
    label: 'Manage',
    items: [
      { name: 'Templates',     href: '/templates', icon: Layers },
      { name: 'Users & Roles', href: '/users',     icon: Users },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

const INTERIOR_NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { name: 'Dashboard',           href: '/interior/dashboard', icon: LayoutDashboard },
      { name: 'CRM',                 href: '/interior/crm',       icon: UserCheck },
      { name: 'Projects',            href: '/interior/projects',  icon: FolderKanban },
      { name: 'Templates',           href: '/interior/templates', icon: Layers },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'User Management',     href: '/interior/users',     icon: UserCog },
      { name: 'Settings',            href: '/interior/settings',  icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';

  const navSections = isInterior ? INTERIOR_NAV_SECTIONS : NAV_SECTIONS;
  const dashboardHome = isInterior ? '/interior/dashboard' : '/dashboard';

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col transition-all duration-300 w-64 lg:translate-x-0 bg-white border-r border-slate-200/80 shadow-[1px_0_12px_rgba(0,0,0,0.03)]',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header Logo Section */}
        <div className={cn(
          "h-16 flex items-center border-b border-slate-100 shrink-0 relative px-5",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}>
          <Link href={dashboardHome} onClick={onClose} className="flex items-center gap-2.5">
            <img 
              src="/SS-Logo-2025-Colour.svg" 
              alt="Sky-Lite" 
              className={cn(
                "transition-all duration-300",
                isCollapsed ? "h-7 w-7 object-contain" : "h-7 w-auto"
              )} 
            />
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                  SKYSTRUCT
                </span>
                {isInterior && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold tracking-wide">
                    Interior
                  </span>
                )}
              </div>
            )}
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Collapse Toggle Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex absolute top-5 -right-3 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition-all z-50 cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-5 space-y-6",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <div className={cn(
                "px-3 mb-2 transition-opacity duration-200",
                isCollapsed ? "lg:opacity-0 lg:h-0 lg:overflow-hidden lg:mb-0" : "opacity-100"
              )}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {section.label}
                </span>
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center transition-all duration-150 font-medium rounded-xl',
                        isCollapsed 
                          ? 'lg:justify-center lg:px-0 lg:w-10 lg:h-10 lg:mx-auto text-sm' 
                          : 'px-3 py-2.5 gap-3 text-xs md:text-sm',
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className={cn(
                        "w-4 h-4 md:w-4.5 md:h-4.5 shrink-0 transition-colors",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      )} />
                      
                      <span className={cn(
                        "transition-opacity duration-200 truncate",
                        isCollapsed ? "lg:hidden" : "block"
                      )}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Seamless Minimalist User Profile Footer */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div className={cn(
            "flex items-center justify-between transition-all rounded-xl p-1.5",
            isCollapsed ? "justify-center" : ""
          )}>
            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center gap-3 min-w-0 flex-1 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              <div className={cn(
                "min-w-0 flex-1 transition-opacity duration-200",
                isCollapsed ? "lg:hidden" : "block"
              )}>
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                  {isInterior ? 'Interior Designer' : (user?.role?.name || 'Member')}
                </p>
              </div>
            </Link>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Users, Settings, X, Layers,
  ChevronLeft, ChevronRight, UserCheck, FolderKanban, UserCog,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { motion } from 'framer-motion';

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
          'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col transition-all duration-300 bg-[#FAFAFA] border-r border-gray-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)]',
          isCollapsed ? 'lg:w-20' : 'lg:w-[280px]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header Logo Section */}
        <div className={cn(
          "h-20 flex items-center shrink-0 relative",
          isCollapsed ? "justify-center px-0" : "px-6 justify-between"
        )}>
          <Link href={dashboardHome} onClick={onClose} className="flex items-center gap-3 outline-none group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
               <img 
                src="/SS-Logo-2025-Colour.svg" 
                alt="Sky-Lite" 
                className="w-5 h-5 object-contain brightness-0 invert"
              />
            </div>
            
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-[15px] tracking-tight leading-tight">
                  SKYSTRUCT
                </span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  {isInterior ? 'Interior' : 'Platform'}
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Collapse Toggle Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex absolute top-6 -right-3.5 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center hover:bg-gray-50 hover:scale-105 hover:text-blue-600 text-slate-400 transition-all z-50 cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 ml-0.5" />
              ) : (
                <ChevronLeft className="w-4 h-4 mr-0.5" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Tabs Section */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-6 space-y-8",
          isCollapsed ? "px-3" : "px-4"
        )} style={{ scrollbarWidth: 'none' }}>
          {navSections.map((section, idx) => (
            <div key={section.label} className="space-y-2">
              {!isCollapsed && (
                <div className="px-4 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    {section.label}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
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
                        'relative group flex items-center transition-all duration-200 outline-none',
                        isCollapsed 
                          ? 'justify-center w-12 h-12 mx-auto rounded-2xl' 
                          : 'px-4 py-3 rounded-2xl gap-3.5',
                        isActive
                          ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-gray-100'
                          : 'hover:bg-gray-100/60 border border-transparent'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabIndicator"
                          className={cn(
                            "absolute bg-blue-600 rounded-full",
                            isCollapsed ? "left-1 w-1 h-6" : "left-0 w-1 h-6"
                          )}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      
                      <div className={cn(
                        "flex items-center justify-center transition-colors duration-200",
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                      )}>
                        <item.icon className="w-[18px] h-[18px] stroke-[2.5px]" />
                      </div>
                      
                      {!isCollapsed && (
                        <span className={cn(
                          "font-bold text-[13px] tracking-wide transition-colors duration-200",
                          isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-900"
                        )}>
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Professional User Profile Footer */}
        <div className="p-4 border-t border-gray-200/60 bg-[#FAFAFA]">
          <div className={cn(
            "flex items-center gap-3 transition-all rounded-2xl p-2",
            isCollapsed ? "justify-center flex-col" : "justify-between bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]",
          )}>
            <Link
              href="/profile"
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 min-w-0 transition-colors",
                isCollapsed ? "justify-center w-full" : "flex-1"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-extrabold text-[13px] flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold text-slate-900 truncate tracking-tight">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                    {isInterior ? 'Interior Designer' : (user?.role?.name || 'Member')}
                  </p>
                </div>
              )}
            </Link>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              >
                <LogOut className="w-[15px] h-[15px] stroke-[2.5px]" />
              </button>
            )}
            
            {isCollapsed && (
               <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="mt-2 w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              >
                <LogOut className="w-[15px] h-[15px] stroke-[2.5px]" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

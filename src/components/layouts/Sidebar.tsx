'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, Users, Settings, X, Layers,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, hasAnyRolePermission } from '@/lib/permissions';
import {
  SIDEBAR_TRANSITION,
  useIsDesktop,
} from '@/components/layouts/sidebarConfig';

const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 60;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string | string[];
  anyRole?: boolean;
  badge?: number;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/construction-dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/construction-dashboard/projects', icon: Briefcase },
  { name: 'Templates', href: '/construction-dashboard/templates', icon: Layers, permission: ['template:view', 'category:view'], anyRole: true },
  { name: 'Team & Roles', href: '/construction-dashboard/users', icon: Users, permission: 'users:view' },
  { name: 'Settings', href: '/construction-dashboard/settings', icon: Settings },
];

const textVariants: Variants = {
  expanded: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: 0.15,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  collapsed: {
    opacity: 0,
    x: -8,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const isDesktop = useIsDesktop(1024);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const organizationName =
    (typeof user?.organization === 'object' && user?.organization !== null ? (user.organization as any).name : null) ||
    (user as any)?.organizationName ||
    '';
  const dashboardHome = '/construction-dashboard';

  const filteredNavigation = navigation.filter((item) =>
    !item.permission ||
    [item.permission].flat().some((p) =>
      item.anyRole ? hasAnyRolePermission(user, p) : hasProjectPermission(user, null, p)
    )
  );

  const isActive = (href: string) => {
    if (href === '/construction-dashboard') {
      return pathname === '/construction-dashboard' || pathname === '/dashboard';
    }
    return (
      pathname === href ||
      (href !== '/' && pathname.startsWith(href + '/')) ||
      (href === '/construction-dashboard/projects' && (pathname === '/projects' || pathname.startsWith('/projects/'))) ||
      (href === '/construction-dashboard/templates' && (pathname === '/templates' || pathname.startsWith('/templates/'))) ||
      (href === '/construction-dashboard/users' && (pathname === '/users' || pathname.startsWith('/users/'))) ||
      (href === '/construction-dashboard/settings' && (pathname === '/settings' || pathname.startsWith('/settings/')))
    );
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group',
          active
            ? 'bg-blue-600 text-white font-medium shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? item.name : undefined}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge ? (
              <span
                className={cn(
                  'min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-semibold px-1.5',
                  active ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <motion.aside
        initial={false}
        animate={{
          width: isDesktop
            ? isCollapsed
              ? SIDEBAR_COLLAPSED_WIDTH
              : SIDEBAR_EXPANDED_WIDTH
            : SIDEBAR_EXPANDED_WIDTH,
        }}
        transition={isMounted ? SIDEBAR_TRANSITION : { duration: 0 }}
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-white border-r border-slate-200/80 shadow-[2px_0_16px_rgba(0,0,0,0.02)] transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header Logo */}
        <div
          className={cn(
            'flex items-center h-16 px-4 border-b border-slate-200/80 shrink-0',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Link
            href={dashboardHome}
            onClick={onClose}
            className="flex items-center gap-2.5 min-w-0 outline-none group flex-1"
            title={isCollapsed ? (organizationName || 'SkyStruct Lite Construction') : undefined}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <img
                src="/SS-Logo-2025-Colour.svg"
                alt="SkyStruct Lite"
                className="w-4 h-4 object-contain brightness-0 invert"
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold tracking-tight text-slate-900 truncate">
                  SkyStruct-Lite
                </h2>
                <p className="text-[10px] text-slate-500 truncate" title={organizationName || 'Workspace'}>
                  {organizationName || 'Workspace'}
                </p>
              </div>
            )}
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav
          className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {filteredNavigation.map(renderNavItem)}
        </nav>

        {/* Footer Area / Collapse Toggle */}
        {onToggleCollapse && (
          <div className="border-t border-slate-200/80 p-2 space-y-0.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer',
                'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span className="truncate">Collapse</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.aside>
    </>
  );
};

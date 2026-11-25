'use client';
import { tr } from '@/i18n';

// Port of interior-os-frontend's components/layout/sidebar.tsx, wired to the
// interior-only localStorage session instead of Zustand's useAuthStore.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Users, Building2, UsersRound,
  ShieldCheck, Truck, Settings, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';
import {
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_TRANSITION,
  useIsDesktop,
} from '@/components/layouts/sidebarConfig';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  wired?: boolean;
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/interior-new', icon: LayoutDashboard, wired: true },
  { label: 'CRM', href: '/interior-new/crm', icon: Users, wired: true },
  { label: 'Projects', href: '/interior-new/projects', icon: FolderKanban, wired: true },
  { label: 'Vendor Management', href: '/interior-new/vendors', icon: Truck, wired: true },
  { label: 'Users & Roles', href: '/interior-new/users-roles', icon: UsersRound, wired: true },
  { label: 'Audit Management', href: '/interior-new/audit', icon: ShieldCheck, wired: true },
  { label: 'Settings', href: '/interior-new/settings', icon: Settings, wired: true },
];

const bottomNavigation: NavItem[] = [];

interface InteriorSidebarProps {
  organizationName?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const textVariants: Variants = {
  expanded: {
    opacity: 1,
    transition: {
      duration: 0.2,
      delay: 0.08,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  collapsed: {
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export function InteriorSidebar({
  organizationName,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: InteriorSidebarProps) {
  const pathname = usePathname();
  const toast = useToast();
  const { isOrgAdmin, currentUser, hasPermission } = usePermissions();
  const isDesktop = useIsDesktop(768);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Sections the server says this user can open (GET /auth/me → navAccess)
  const navAccess: Record<string, boolean> | undefined = currentUser?.navAccess;
  const NAV_ACCESS_KEY: Record<string, string> = {
    '/interior-new/crm': 'crm',
    '/interior-new/projects': 'projects',
    '/interior-new/vendors': 'vendors',
    '/interior-new/users-roles': 'usersRoles',
    '/interior-new/audit': 'audit',
  };

  const filteredNavigation = navigation.filter((item) => {
    if (item.href === '/interior-new/audit' || item.label === 'Audit Management') {
      return isOrgAdmin || hasPermission('audit_logs', 'read') || navAccess?.audit === true;
    }
    const key = NAV_ACCESS_KEY[item.href];
    if (!isOrgAdmin && key && navAccess && navAccess[key] === false) return false;
    return true;
  });

  const isActive = (href: string) =>
    pathname === href || (href !== '/interior-new' && pathname.startsWith(href + '/'));

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href}
        href={item.wired ? item.href : '#'}
        onClick={(e) => {
          if (!item.wired) {
            e.preventDefault();
            toast.info(tr("\"{{label}}\" is coming soon.", { label: item.label }));
            return;
          }
          onCloseMobile();
        }}
        className={cn(
          'relative flex items-center h-9 rounded-lg text-sm transition-colors duration-150 outline-none group overflow-hidden w-full',
          active
            ? 'bg-[hsl(var(--sidebar-primary,var(--primary)))] text-white font-medium shadow-sm'
            : 'text-[hsl(var(--foreground)/0.7)] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3'
        )}
        title={collapsed ? tr(item.label) : undefined}
      >
        <div className="flex items-center justify-center shrink-0 w-4 h-4">
          <item.icon className="w-4 h-4 shrink-0" />
        </div>

        {!collapsed && (
          <motion.span
            variants={textVariants}
            initial={false}
            animate="expanded"
            className="flex-1 truncate"
          >
            {tr(item.label)}
          </motion.span>
        )}

        {!collapsed && item.badge ? (
          <span
            className={cn(
              'min-w-[1.25rem] h-5 flex items-center justify-center rounded-full text-[0.625rem] font-semibold px-1.5',
              active ? 'bg-white/20 text-white' : 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
            )}
          >
            {tr(item.badge)}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <motion.aside
        initial={false}
        animate={{
          width: isDesktop
            ? collapsed
              ? SIDEBAR_COLLAPSED_WIDTH
              : SIDEBAR_EXPANDED_WIDTH
            : SIDEBAR_EXPANDED_WIDTH,
        }}
        transition={isMounted ? SIDEBAR_TRANSITION : { duration: 0 }}
        className={cn(
          'interior-os-theme h-screen h-dvh flex flex-col border-e border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-hidden shrink-0',
          'will-change-[width]',
          'fixed md:static top-0 start-0 z-50 md:z-40',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header Logo — Perfectly centered in 60px collapsed width */}
        <div
          className={cn(
            'flex items-center h-[4.5rem] border-b border-[hsl(var(--border))] overflow-hidden shrink-0',
            collapsed ? 'justify-center px-0' : 'px-4'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <motion.div
                variants={textVariants}
                initial={false}
                animate="expanded"
                className="min-w-0 flex-1 overflow-hidden"
              >
                <h2 className="text-sm font-bold tracking-tight text-[hsl(var(--foreground))] truncate">
                  {tr("SkyStruct-Lite Interior")}
                </h2>
                <p className="text-[0.625rem] text-[hsl(var(--muted-foreground))] truncate">
                  {organizationName || tr("Workspace")}
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation Items (Single flat list, no extra section headers) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {filteredNavigation.map(renderNavItem)}
        </nav>

        {/* Footer Area — Perfectly centered in 60px collapsed width */}
        <div className="border-t border-[hsl(var(--border))] p-2 space-y-1 shrink-0">
          {bottomNavigation.map(renderNavItem)}

          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'w-full flex items-center h-9 rounded-lg text-sm transition-colors overflow-hidden cursor-pointer',
              'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            )}
            title={collapsed ? tr("Expand sidebar") : undefined}
          >
            <div className="flex items-center justify-center shrink-0 w-4 h-4">
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={SIDEBAR_TRANSITION}
                className="flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.div>
            </div>

            {!collapsed && (
              <motion.span
                variants={textVariants}
                initial={false}
                animate="expanded"
                className="overflow-hidden whitespace-nowrap"
              >
                {tr("Collapse")}
              </motion.span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

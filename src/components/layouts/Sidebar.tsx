'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, Users, Settings, X, Layers,
  PanelLeftClose, PanelLeftOpen, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, hasAnyRolePermission } from '@/lib/permissions';
import {
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_TRANSITION,
  useIsDesktop,
} from '@/components/layouts/sidebarConfig';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV_SECTIONS: { label: string; items: { name: string; href: string; icon: any; permission?: string | string[]; anyRole?: boolean }[] }[] = [
  {
    label: 'WORKSPACE',
    items: [
      { name: 'Dashboard', href: '/construction-dashboard', icon: LayoutDashboard },
      { name: 'Projects', href: '/construction-dashboard/projects', icon: Briefcase },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Templates', href: '/construction-dashboard/templates', icon: Layers, permission: ['template:view', 'category:view'], anyRole: true },
      { name: 'Team & Roles', href: '/construction-dashboard/users', icon: Users, permission: 'users:view' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { name: 'Settings', href: '/construction-dashboard/settings', icon: Settings },
    ],
  },
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
  onToggleCollapse
}) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const organizationName =
    (typeof user?.organization === 'object' && user?.organization !== null ? (user.organization as any).name : null) ||
    (user as any)?.organizationName ||
    '';
  const dashboardHome = '/construction-dashboard';

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
          'bg-white border-r border-slate-200/80',
          'overflow-hidden flex flex-col shrink-0',
          'will-change-[width]',
          'max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:bottom-0 max-lg:z-50',
          'lg:sticky lg:top-0 lg:h-screen lg:z-40',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header Logo */}
        <div className="h-16 flex items-center shrink-0 border-b border-slate-100 px-4 justify-between overflow-hidden">
          <Link
            href={dashboardHome}
            onClick={onClose}
            className="flex items-center gap-3 outline-none min-w-0 group flex-1"
            title={isCollapsed ? (organizationName || 'SkyStruct Lite') : undefined}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-700 text-white shadow-sm shadow-blue-600/30 border border-white/20 shrink-0 group-hover:scale-105 transition-transform">
              <img
                src="/SS-Logo-2025-Colour.svg"
                alt="SkyStruct Lite"
                className="w-5 h-5 object-contain brightness-0 invert"
              />
            </div>

            <motion.div
              variants={textVariants}
              initial={false}
              animate={isCollapsed ? 'collapsed' : 'expanded'}
              className={cn(
                'flex flex-col min-w-0 flex-1 overflow-hidden whitespace-nowrap',
                isCollapsed && 'pointer-events-none'
              )}
            >
              <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight truncate">
                SKYSTRUCT <span className="text-blue-600">LITE</span>
              </span>
              <span
                className="text-[10px] font-bold text-slate-500 truncate flex items-center gap-1 mt-0.5"
                title={organizationName || 'Construction'}
              >
                <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate">{organizationName || 'Construction'}</span>
              </span>
            </motion.div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav
          className="flex-1 overflow-y-auto py-5 space-y-6 px-3.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {NAV_SECTIONS.map((section, sIndex) => (
            <div key={section.label} className="space-y-1.5">
              <motion.div
                animate={{
                  opacity: isCollapsed ? 0 : 1,
                  height: isCollapsed ? 0 : 18,
                  marginBottom: isCollapsed ? 0 : 6,
                }}
                transition={{
                  duration: 0.3,
                  delay: isCollapsed ? 0 : 0.1,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="px-3 overflow-hidden whitespace-nowrap"
              >
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  {section.label}
                </span>
              </motion.div>

              {isCollapsed && sIndex > 0 && (
                <div className="w-6 h-px bg-slate-200/60 mx-auto my-2" />
              )}

              <div className="space-y-1">
                {section.items
                  .filter((item) =>
                    !item.permission ||
                    [item.permission].flat().some((p) =>
                      item.anyRole
                        ? hasAnyRolePermission(user, p)
                        : hasProjectPermission(user, null, p)
                    )
                  )
                  .map((item) => {
                    const isActive =
                      item.href === '/construction-dashboard'
                        ? pathname === '/construction-dashboard'
                        : (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/')));

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'relative flex items-center h-11 w-full px-3',
                          'rounded-xl overflow-hidden',
                          'transition-colors duration-200 select-none outline-none',
                          isActive
                            ? 'bg-blue-50/90 border border-blue-200/80 text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent',
                          isCollapsed && 'justify-center'
                        )}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <div className={cn(
                          "flex items-center justify-center shrink-0 w-5 h-5 transition-colors duration-150",
                          isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-900"
                        )}>
                          <item.icon className="w-5 h-5 stroke-[2.2]" />
                        </div>

                        <motion.span
                          variants={textVariants}
                          initial={false}
                          animate={isCollapsed ? 'collapsed' : 'expanded'}
                          className={cn(
                            'text-sm font-bold tracking-tight truncate whitespace-nowrap ml-3',
                            isCollapsed && 'pointer-events-none'
                          )}
                        >
                          {item.name}
                        </motion.span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Area */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {onToggleCollapse && (
            <div className="pt-0.5">
              <button
                type="button"
                onClick={onToggleCollapse}
                className={cn(
                  'relative flex items-center h-10 w-full px-3',
                  'rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-slate-200/50 text-[13px] font-semibold cursor-pointer group shadow-2xs overflow-hidden transition-colors duration-200',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? 'Expand sidebar' : undefined}
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  className="flex items-center justify-center shrink-0 w-5 h-5 text-slate-400 group-hover:text-slate-700"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4" />
                  )}
                </motion.div>

                <motion.span
                  variants={textVariants}
                  initial={false}
                  animate={isCollapsed ? 'collapsed' : 'expanded'}
                  className={cn(
                    'truncate whitespace-nowrap ml-2.5 text-left',
                    isCollapsed && 'pointer-events-none'
                  )}
                >
                  Collapse sidebar
                </motion.span>
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
};

'use client';

// Port of interior-os-frontend's components/layout/sidebar.tsx, wired to the
// interior-only localStorage session instead of Zustand's useAuthStore.

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Users, Bell, Settings, ChevronLeft, ChevronRight, Building2, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';

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
  { label: 'Users & Roles', href: '/interior-new/users-roles', icon: UsersRound, wired: true },
];

const bottomNavigation: NavItem[] = [];

interface InteriorSidebarProps {
  organizationName?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function InteriorSidebar({ organizationName, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: InteriorSidebarProps) {
  const pathname = usePathname();
  const toast = useToast();

  const isActive = (href: string) => pathname === href || (href !== '/interior-new' && pathname.startsWith(href + '/'));

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.wired ? item.href : '#'}
        onClick={(e) => {
          if (!item.wired) {
            e.preventDefault();
            toast.info(`"${item.label}" is coming soon.`);
            return;
          }
          onCloseMobile();
        }}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group',
          active
            ? 'bg-[hsl(var(--sidebar-primary,var(--primary)))] text-white font-medium shadow-sm'
            : 'text-[hsl(var(--foreground)/0.7)] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className={cn('min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-semibold px-1.5', active ? 'bg-white/20 text-white' : 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]')}>
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
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={cn(
          'interior-os-theme h-screen flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] transition-all duration-300',
          'fixed md:sticky top-0 left-0 z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-[60px]' : 'w-[260px]'
        )}
      >
        <div className={cn('flex items-center h-16 px-4 border-b border-[hsl(var(--border))]', collapsed && 'justify-center px-2')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-[hsl(var(--foreground))] truncate">InteriorOS</h2>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{organizationName || 'Workspace'}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navigation.map(renderNavItem)}
        </nav>

        <div className="border-t border-[hsl(var(--border))] p-2 space-y-0.5">
          {bottomNavigation.map(renderNavItem)}

          <button
            onClick={onToggleCollapse}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : (<><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>)}
          </button>
        </div>
      </aside>
    </>
  );
}

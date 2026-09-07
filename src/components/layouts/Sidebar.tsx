'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Users, Settings, X, Layers,
  LogOut, Wallet, ShieldCheck, PanelLeftClose, PanelLeftOpen,
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
    label: 'WORKSPACE',
    items: [
      { name: 'Dashboard', href: '/construction-dashboard', icon: LayoutDashboard },
      { name: 'Projects', href: '/construction-dashboard/projects', icon: Briefcase },
     
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Templates', href: '/construction-dashboard/templates', icon: Layers },
      { name: 'Team & Roles', href: '/construction-dashboard/users', icon: Users },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { name: 'Settings', href: '/construction-dashboard/settings', icon: Settings },
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

  const roleName = user?.role?.name || 'Admin';
  const dashboardHome = '/construction-dashboard';

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 z-50 flex flex-col transition-all duration-200 bg-white border-r border-slate-200/80 shadow-[2px_0_16px_rgba(0,0,0,0.02)]',
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header Logo */}
        <div className={cn(
          "h-16 flex items-center shrink-0 border-b border-slate-100",
          isCollapsed ? "justify-center px-2" : "px-5 justify-between"
        )}>
          <Link href={dashboardHome} onClick={onClose} className="flex items-center gap-3 outline-none min-w-0 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white shadow-sm shadow-indigo-600/30 border border-white/20 group-hover:scale-105 transition-all shrink-0">
              <img
                src="/SS-Logo-2025-Colour.svg"
                alt="SkyStruct Lite"
                className="w-5 h-5 object-contain brightness-0 invert"
              />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-slate-900 text-sm  tracking-tight leading-tight">
                  SKYSTRUCT <span className="text-indigo-600">LITE</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">
                  Construction
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-5 space-y-6",
          isCollapsed ? "px-2" : "px-3.5"
        )} style={{ scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-3 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    {section.label}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
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
                        'relative flex items-center transition-all duration-150 outline-none rounded-xl group select-none',
                        isCollapsed
                          ? 'justify-center w-11 h-11 mx-auto'
                          : 'px-3.5 h-11 gap-3',
                        isActive
                          ? 'bg-indigo-50/90 border border-indigo-200/80 text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <div className={cn(
                        "flex items-center justify-center shrink-0 transition-colors duration-150",
                        isActive ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-900"
                      )}>
                        <item.icon className="w-5 h-5 stroke-[2.2]" />
                      </div>

                      {!isCollapsed && (
                        <span className={cn(
                          "text-sm font-bold tracking-tight truncate flex-1",
                          isActive ? "text-indigo-700" : "text-slate-600 group-hover:text-slate-900"
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

        {/* Footer Area */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {/* User Profile Card */}
          <div className={cn(
            "flex items-center gap-2.5 transition-all rounded-2xl p-2",
            isCollapsed ? "justify-center flex-col" : "justify-between bg-white border border-slate-200/80 shadow-xs"
          )}>
            <Link
              href="/construction-dashboard/settings"
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 min-w-0 transition-colors group",
                isCollapsed ? "justify-center w-full" : "flex-1"
              )}
              title={isCollapsed ? (user?.name || 'Profile') : undefined}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate tracking-tight group-hover:text-indigo-600 transition-colors">
                    {user?.name || 'Account'}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{roleName}</span>
                  </p>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Expand / Collapse Button */}
          {onToggleCollapse && (
            <div className="pt-0.5">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-slate-200/50 transition-all text-[13px] font-semibold cursor-pointer group shadow-2xs"
                >
                  <PanelLeftClose className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  <span>Collapse sidebar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-10 h-8 mx-auto flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/50 transition-all cursor-pointer shadow-2xs"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
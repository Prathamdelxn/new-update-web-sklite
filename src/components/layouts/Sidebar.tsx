'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Users, Settings, X, Layers,
  ChevronLeft, ChevronRight
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

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 bg-white border-r border-gray-100 z-50 flex flex-col transition-all duration-300 w-64 lg:translate-x-0',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className={cn(
          "h-16 flex items-center border-b border-gray-100 shrink-0 relative",
          isCollapsed ? "justify-center px-0" : "px-5"
        )}>
          <Link href="/dashboard" onClick={onClose} className="flex justify-center w-full">
            <img 
              src="/SS-Logo-2025-Colour.svg" 
              alt="Sky-Lite" 
              className={cn(
                "transition-all duration-300",
                isCollapsed ? "h-8 w-8 object-contain" : "h-9 w-auto"
              )} 
            />
          </Link>
          <button
            onClick={onClose}
            className="absolute right-4 lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Collapse/Expand Toggle Button (Desktop only) */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex absolute top-5 -right-3 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all z-50 cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={cn(
          "flex-1 overflow-y-auto py-5 space-y-6",
          isCollapsed ? "px-1" : "px-3"
        )}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className={cn(
                "px-3 mb-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-[0.14em] transition-opacity duration-200",
                isCollapsed ? "lg:opacity-0 lg:h-0 lg:overflow-hidden lg:mb-0" : "opacity-100"
              )}>
                {section.label}
              </p>
              <div className="space-y-0.5">
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
                        'flex items-center transition-all',
                        isCollapsed 
                          ? 'lg:justify-center lg:px-0 lg:w-10 lg:h-10 lg:mx-auto rounded-xl text-sm font-semibold' 
                          : 'px-3 py-2.5 gap-3 rounded-xl text-sm font-semibold',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:text-gray-900 hover:bg-gray-50'
                      )}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon
                        className={cn('w-5 h-5 shrink-0 transition-colors', isActive ? 'text-blue-600' : 'text-slate-400')}
                      />
                      <span className={cn(
                        "transition-opacity duration-200",
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

        {/* User footer */}
        <div className="p-3 border-t border-gray-100 shrink-0">
          <Link
            href="/profile"
            onClick={onClose}
            className={cn(
              "flex items-center hover:bg-gray-50 transition-colors",
              isCollapsed 
                ? "lg:justify-center lg:px-0 lg:w-10 lg:h-10 lg:mx-auto rounded-xl" 
                : "px-3 py-2.5 gap-3 rounded-xl"
            )}
            title={isCollapsed ? user?.name || 'User' : undefined}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className={cn(
              "min-w-0 flex-1 transition-opacity duration-200",
              isCollapsed ? "lg:hidden" : "block"
            )}>
              <p className="text-xs font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role?.name || 'Member'}</p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};

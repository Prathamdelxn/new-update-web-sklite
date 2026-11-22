'use client';
import { tr } from '@/i18n';

import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ChevronDown, Building2, Globe } from 'lucide-react';
import { LanguageToggleButton } from '@/components/interior/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/providers/AuthContext';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
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
  const { lang, setLanguage } = useI18n();

  const organizationName =
    (typeof user?.organization === 'object' && user?.organization !== null ? (user.organization as any).name : null) ||
    (user as any)?.organizationName ||
    '';

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

  const userDisplayName =
    user?.name ||
    [(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(' ') ||
    'User';

  const initials = (() => {
    if (!user) return '?';
    if (user.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    if ((user as any)?.firstName) {
      return `${(user as any).firstName[0] || ''}${(user as any).lastName?.[0] || ''}`.toUpperCase();
    }
    return 'U';
  })();

  return (
    <header
      className={cn(
        "fixed top-0 end-0 start-0 z-30 h-16 bg-white border-b border-slate-200/80 transition-all duration-200",
        isSidebarCollapsed ? 'lg:left-[60px]' : 'lg:left-[260px]'
      )}
    >
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left Section: Mobile Menu & Header Content */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label={tr("Open sidebar")}
          >
            <Menu className="w-4 h-4" />
          </button>

          {headerContent && (
            <div className="min-w-0 flex-1 flex items-center">
              {tr(headerContent)}
            </div>
          )}
        </div>

        {/* Right Section: Notifications & User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <LanguageToggleButton className="hidden sm:inline-flex" />
          <NotificationCenter />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-2 h-9 ps-1.5 pe-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-xs">
                {tr(initials)}
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-900 max-w-[140px] truncate">
                {tr(userDisplayName)}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                  showMenu && "rotate-180"
                )}
              />
            </button>

            {showMenu && (
              <div className="absolute end-0 top-full mt-1.5 w-56 rounded-xl border border-slate-200/80 bg-white shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {tr(userDisplayName)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email || ''}
                  </p>
                  {organizationName && (
                    <p
                      className="text-[11px] font-medium text-blue-600 truncate mt-1.5 flex items-center gap-1.5"
                      title={organizationName}
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{tr(organizationName)}</span>
                    </p>
                  )}
                </div>

                <div className="py-1 px-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setLanguage(lang === 'ar' ? 'en' : 'ar');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'ar' ? tr("English") : 'العربية'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>{tr("Sign out")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

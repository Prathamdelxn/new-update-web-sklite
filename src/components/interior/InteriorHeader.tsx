'use client';

// Port of interior-os-frontend's components/layout/header.tsx, wired to the
// interior-only localStorage session instead of Zustand's useAuthStore.

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, LogOut, ChevronDown, User, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/interior/ui';
import { cn } from '@/lib/utils';
import { logoutInterior } from '@/lib/interiorAuth';

interface InteriorHeaderProps {
  user: { firstName?: string; lastName?: string; email?: string } | null;
  onMobileMenuClick: () => void;
}

export function InteriorHeader({ user, onMobileMenuClick }: InteriorHeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logoutInterior();
    router.push('/login');
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '?';

  return (
    <header className="interior-os-theme h-16 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 gap-4">
      <Button variant="outline" size="sm" onClick={onMobileMenuClick} className="md:hidden text-[hsl(var(--muted-foreground))] shrink-0 px-2">
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex-1 max-w-md">
       
      </div>

      <div className="flex items-center gap-2 ml-4">
        <Button variant="outline" size="sm" className="relative text-[hsl(var(--muted-foreground))] px-2">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[hsl(var(--destructive))] rounded-full" />
        </Button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            {user && (
              <span className="hidden md:block text-sm font-medium text-[hsl(var(--foreground))] max-w-[120px] truncate">
                {user.firstName}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <DropdownItem icon={User} label="Profile" onClick={() => { setShowUserMenu(false); router.push('/interior-new/profile'); }} />
              </div>
              <div className="border-t border-[hsl(var(--border))] py-1">
                <DropdownItem icon={LogOut} label="Sign out" onClick={handleLogout} destructive />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DropdownItem({ icon: Icon, label, onClick, destructive }: { icon: React.ElementType; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
        destructive ? 'text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]' : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

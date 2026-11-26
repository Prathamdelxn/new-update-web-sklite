'use client';
import { tr } from '@/i18n';

import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserList } from '@/features/users/components/UserList';
import { RoleList } from '@/features/users/components/RoleList';
import { UserManagementGate } from '@/features/users/components/UserManagementGate';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  return (
    <UserManagementGate>
      <div className="space-y-4">
        {/* ── Top Hero Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {tr("Organisation ")}{tr("Members")}
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {tr("Manage organisation-level team members, access tiers, and governance role permissions.")}
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            {([['users', Users, 'Members'], ['roles', Shield, 'Roles & Permissions']] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === key
                    ? "bg-white text-blue-600 border border-slate-300"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tr(label)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Content View ── */}
        <div className="min-h-[500px]">
          {activeTab === 'users' ? <UserList /> : <RoleList />}
        </div>
      </div>
    </UserManagementGate>
  );
}

'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layouts/Shell';
import { Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserList } from '@/features/users/components/UserList';
import { RoleList } from '@/features/users/components/RoleList';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Organisation Members</h1>
            <p className="text-slate-500 mt-1">Manage all organisation-level users, roles, and access permissions.</p>
          </div>

          <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-2xl">
            {([['users', Users, 'Users'], ['roles', Shield, 'Roles & Permissions']] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeTab === key
                    ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                    : "text-slate-500 hover:text-gray-700"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[600px]">
          {activeTab === 'users' ? <UserList /> : <RoleList />}
        </div>
      </div>
    </Shell>
  );
}

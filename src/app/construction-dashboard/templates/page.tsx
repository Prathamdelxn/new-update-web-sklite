'use client';

import React, { useState } from 'react';
import { LayoutGrid, List, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateList } from '@/features/templates/components/TemplateList';
import { CategoryList } from '@/features/templates/components/CategoryList';
import { useAuth } from '@/providers/AuthContext';
import { hasAnyRolePermission } from '@/lib/permissions';

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  // Each tab needs its own View permission (Template / Category Management)
  // Global role or any project role counts (org-wide modules)
  const canViewTemplates = hasAnyRolePermission(user, 'template:view');
  const canViewCategories = hasAnyRolePermission(user, 'category:view');
  const tabs = ([['templates', LayoutGrid, 'Templates'], ['categories', List, 'Categories']] as const)
    .filter(([key]) => (key === 'templates' ? canViewTemplates : canViewCategories));

  const [selectedTab, setSelectedTab] = useState<'templates' | 'categories'>('templates');
  // Fall back to whichever tab the user is allowed to see
  const activeTab = tabs.some(([key]) => key === selectedTab) ? selectedTab : tabs[0]?.[0];

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Project Templates</h1>
          <p className="text-slate-500 mt-1">Standardize your workflows with reusable project blueprints.</p>
        </div>

        {tabs.length > 0 && (
          <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-2xl">
            {tabs.map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setSelectedTab(key)}
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
        )}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'templates' && <TemplateList />}
        {activeTab === 'categories' && <CategoryList />}
        {!activeTab && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-slate-700">You don't have access to templates</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Ask your admin to enable <span className="font-semibold">Template Management → View</span> on your role.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

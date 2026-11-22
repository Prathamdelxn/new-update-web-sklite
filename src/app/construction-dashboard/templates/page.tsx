'use client';
import { tr } from '@/i18n';

import React, { useState } from 'react';
import { LayoutGrid, FolderTree, ShieldAlert, Layers } from 'lucide-react';
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
  const tabs = ([['templates', LayoutGrid, 'Templates'], ['categories', FolderTree, 'Categories']] as const)
    .filter(([key]) => (key === 'templates' ? canViewTemplates : canViewCategories));

  const [selectedTab, setSelectedTab] = useState<'templates' | 'categories'>('templates');
  // Fall back to whichever tab the user is allowed to see
  const activeTab = tabs.some(([key]) => key === selectedTab) ? selectedTab : tabs[0]?.[0];

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* ── Top Hero Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {tr("Templates Management")}
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {tr("Standardize site delivery and workflows with reusable project templates and categorized specifications.")}
          </p>
        </div>

        {tabs.length > 0 && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            {tabs.map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setSelectedTab(key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === key
                    ? "bg-white text-blue-600 border border-slate-300 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tr(label)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Content Area ── */}
      <div className="min-h-[500px]">
        {activeTab === 'templates' && <TemplateList />}
        {activeTab === 'categories' && <CategoryList />}
        {!activeTab && (
          <div className="bg-white rounded-xl border border-slate-300 p-12 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-slate-800">{tr("You don't have access to templates")}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {tr("Ask your admin to enable ")}<span className="font-semibold text-slate-700">{tr("Template Management → View")}</span>{tr(" on your role.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layouts/Shell';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateList } from '@/features/templates/components/TemplateList';
import { CategoryList } from '@/features/templates/components/CategoryList';

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'categories'>('templates');

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Project Templates</h1>
            <p className="text-slate-500 mt-1">Standardize your workflows with reusable project blueprints.</p>
          </div>

          <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-2xl">
            {([['templates', LayoutGrid, 'Templates'], ['categories', List, 'Categories']] as const).map(([key, Icon, label]) => (
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
          {activeTab === 'templates' ? <TemplateList /> : <CategoryList />}
        </div>
      </div>
    </Shell>
  );
}

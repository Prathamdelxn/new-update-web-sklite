'use client';
import { tr } from '@/i18n';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { RoleList } from '@/features/users/components/RoleList';

export default function RolesPage() {
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {tr("Role Management")}
          </h1>

          <p className="text-sm text-slate-500 mt-0.5">
            {tr("Manage all organization roles and permissions.")}
          </p>
        </div>
      </div>

      <RoleList />
    </div>
  );
}
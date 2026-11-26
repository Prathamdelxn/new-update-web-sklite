'use client';
import { tr } from '@/i18n';

import { GlassCard } from '@/components/ui/GlassCard';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  Users,
} from 'lucide-react';

export default function UserManagementPage() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}

        <div className="flex items-center gap-4 mb-8">

          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {tr("User Management")}
            </h1>

            <p className="text-sm text-slate-500 mt-0.5">
              {tr("Manage organization members and roles.")}
            </p>
          </div>

        </div>

        <div className="space-y-6">

          {/* Role Management */}

          <GlassCard className="rounded-2xl border border-gray-200 overflow-hidden">

            <button
              onClick={() => router.push('/construction-dashboard/settings/user-management/roles')}
              className="w-full flex items-center justify-between px-8 py-7 hover:bg-gray-50 transition"
            >

              <div className="flex items-center gap-5">

                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">

                  <Shield className="w-8 h-8 text-blue-600" />

                </div>

                <div className="text-start">

                  <h2 className="text-xl font-semibold text-gray-900">
                    {tr("Role Management")}
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {tr("Create roles, assign permissions and manage system access.")}
                  </p>

                </div>

              </div>

              <ChevronRight className="w-6 h-6 text-gray-400" />

            </button>

          </GlassCard>

          {/* Member Management */}

          <GlassCard className="rounded-2xl border border-gray-200 overflow-hidden">

            <button
              onClick={() => router.push('/construction-dashboard/settings/user-management/members')}
              className="w-full flex items-center justify-between px-8 py-7 hover:bg-gray-50 transition"
            >

              <div className="flex items-center gap-5">

                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">

                  <Users className="w-8 h-8 text-green-600" />

                </div>

                <div className="text-start">

                  <h2 className="text-xl font-semibold text-gray-900">
                    {tr("Member Management")}
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {tr("Invite members and assign them to roles.")}
                  </p>

                </div>

              </div>

              <ChevronRight className="w-6 h-6 text-gray-400" />

            </button>

          </GlassCard>

        </div>

      </div>
  );
}
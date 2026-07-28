'use client';

import { Shell } from '@/components/layouts/Shell';
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
    <Shell>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}

        <div className="flex items-center gap-4 mb-8">

          <button
            onClick={() => router.back()}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>

            <p className="text-gray-500 mt-1">
              Manage organization members and roles.
            </p>
          </div>

        </div>

        <div className="space-y-6">

          {/* Role Management */}

          <GlassCard className="rounded-3xl border border-gray-200 overflow-hidden">

            <button
              onClick={() => router.push('/settings/user-management/roles')}
              className="w-full flex items-center justify-between px-8 py-7 hover:bg-gray-50 transition"
            >

              <div className="flex items-center gap-5">

                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">

                  <Shield className="w-8 h-8 text-blue-600" />

                </div>

                <div className="text-left">

                  <h2 className="text-xl font-semibold text-gray-900">
                    Role Management
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Create roles, assign permissions and manage system access.
                  </p>

                </div>

              </div>

              <ChevronRight className="w-6 h-6 text-gray-400" />

            </button>

          </GlassCard>

          {/* Member Management */}

          <GlassCard className="rounded-3xl border border-gray-200 overflow-hidden">

            <button
              onClick={() => router.push('/settings/user-management/members')}
              className="w-full flex items-center justify-between px-8 py-7 hover:bg-gray-50 transition"
            >

              <div className="flex items-center gap-5">

                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">

                  <Users className="w-8 h-8 text-green-600" />

                </div>

                <div className="text-left">

                  <h2 className="text-xl font-semibold text-gray-900">
                    Member Management
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Invite members and assign them to roles.
                  </p>

                </div>

              </div>

              <ChevronRight className="w-6 h-6 text-gray-400" />

            </button>

          </GlassCard>

        </div>

        {/* Future API Notes */}

        {/*
          No API required on this page.

          Navigation only.

          Routes:
          /settings/user-management/roles
          /settings/user-management/members
        */}

      </div>
    </Shell>
  );
}
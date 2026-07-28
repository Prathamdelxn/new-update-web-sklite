'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  ArrowLeft,
  Save,
  Shield,
} from 'lucide-react';

export default function NewRolePage() {
  const router = useRouter();

  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      alert('Role Identity Name is required');
      return;
    }

    setLoading(true);

    try {
      // =====================================================
      // TODO:
      //
      // Call your API here
      //
      // POST /api/roles
      //
      // Body:
      // {
      //   name: roleName,
      //   description: description
      // }
      //
      // After success:
      // router.push('/settings/user-management/roles');
      //
      // =====================================================

      console.log({
        name: roleName,
        description,
      });

      alert('Role Created Successfully (Static Demo)');

      router.push('/settings/user-management/roles');
    } catch (error) {
      console.error(error);
      alert('Unable to create role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto p-8">

        {/* Header */}

        <div className="flex items-center gap-4 mb-8">

          <button
            onClick={() => router.back()}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>

            <h1 className="text-3xl font-bold">
              Create New Role
            </h1>

            <p className="text-gray-500 mt-1">
              Add a new role to your organization.
            </p>

          </div>

        </div>

        <GlassCard className="rounded-3xl border border-gray-200 p-8">

          <div className="flex items-center gap-3 mb-8">

            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">

              <Shield className="w-7 h-7 text-blue-600" />

            </div>

            <div>

              <h2 className="text-xl font-semibold">
                Role Details
              </h2>

              <p className="text-gray-500">
                Enter the information below.
              </p>

            </div>

          </div>

          {/* Role Name */}

          <div className="mb-6">

            <label className="block font-semibold mb-2">
              Role Identity Name
              <span className="text-red-500 ml-1">*</span>
            </label>

            <input
              type="text"
              placeholder="Example: Project Manager"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* Description */}

          <div>

            <label className="block font-semibold mb-2">
              Role Description
              <span className="text-gray-400 ml-2 text-sm">
                (Optional)
              </span>
            </label>

            <textarea
              rows={5}
              placeholder="Describe this role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* Buttons */}

          <div className="flex justify-end gap-4 mt-10">

            <button
              onClick={() => router.back()}
              className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              onClick={handleCreateRole}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-5 h-5" />

              {loading ? 'Creating...' : 'Create Role'}
            </button>

          </div>

        </GlassCard>

        {/* ============================
            API Integration

            POST /api/roles

            Body:

            {
              name: roleName,
              description: description
            }

            On Success:

            router.push('/settings/user-management/roles')

        ============================ */}

      </div>
    </Shell>
  );
}
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UserList } from '@/features/users/components/UserList';

export default function MembersPage() {
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-3xl font-bold">
            Member Management
          </h1>

          <p className="text-gray-500 mt-1">
            Manage all organization members.
          </p>
        </div>
      </div>

      <UserList />
    </div>
  );
}
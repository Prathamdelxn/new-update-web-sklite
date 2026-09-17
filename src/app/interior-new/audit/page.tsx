'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Audit Management Page
// Restricted to Admins only
// =============================================================================

import React from 'react';
import { useRouter } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import InteriorAuditManagementView from '@/features/interior-new/components/InteriorAuditManagementView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/interior/ui';

export default function InteriorAuditPage() {
  const checked = useInteriorAuthGuard();
  const { isOrgAdmin, currentUser } = usePermissions();
  const router = useRouter();

  if (!checked) return null;

  // Once user is loaded, verify admin privilege
  if (currentUser && !isOrgAdmin) {
    return (
      <InteriorShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2 mb-6">
            The Audit Management section is restricted to Organization Administrators and Super Admins only.
          </p>
          <Button
            onClick={() => router.push('/interior-new')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </InteriorShell>
    );
  }

  return (
    <InteriorShell>
      <InteriorAuditManagementView />
    </InteriorShell>
  );
}


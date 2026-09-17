'use client';
import { useRouter } from 'next/navigation';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { AuditTab } from '@/features/projects/audit/components/AuditTab';
import { useIsAdmin } from '@/hooks/usePermission';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AuditTabPage() {
  const { project, projectId } = useProjectContext();
  const isAdmin = useIsAdmin();
  const router = useRouter();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white border border-slate-200/80 rounded-2xl shadow-card">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
          Project audit logs and activity history are restricted to Administrators only.
        </p>
        <button
          onClick={() => router.push(`/construction-dashboard/projects/${projectId}/details`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Overview
        </button>
      </div>
    );
  }

  return <AuditTab project={project} />;
}


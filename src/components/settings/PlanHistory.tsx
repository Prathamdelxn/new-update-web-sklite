'use client';
import { tr } from '@/i18n';

interface HistoryEntry {
  plan: string;
  status: string;
  changedBy: string;
  reason: string;
  timestamp: string;
}

interface PlanHistoryProps {
  history: HistoryEntry[];
}

export default function PlanHistory({ history }: PlanHistoryProps) {
  const entries = [...history].reverse();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">

      <h3 className="text-xs tracking-[4px] uppercase font-bold text-blue-600 mb-6">
        {tr("Plan History")}
      </h3>

      {entries.length === 0 ? (
        <p className="text-slate-400">{tr("No plan changes yet.")}</p>
      ) : (
        <div className="space-y-6">
          {entries.map((entry, i) => (
            <div className="flex gap-4" key={i}>

              <div className="w-3 h-3 rounded-full bg-slate-500 mt-2"></div>

              <div>

                <h4 className="font-semibold">
                  {tr(entry.plan)} — {tr(entry.status)}
                </h4>

                <p className="text-slate-500 mt-1">
                  {tr(entry.reason)}
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}

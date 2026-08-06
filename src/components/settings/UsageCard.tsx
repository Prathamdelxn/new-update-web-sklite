'use client';

interface UsageCardProps {
  projects: number;
  members: number;
  maxProjects: number | null;
  maxUsers: number | null;
}

function usageBar(used: number, max: number | null) {
  const label = max === null ? `${used} / Unlimited` : `${used} / ${max}`;
  const pct = max === null || max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return { label, pct };
}

export default function UsageCard({ projects, members, maxProjects, maxUsers }: UsageCardProps) {
  const projectUsage = usageBar(projects, maxProjects);
  const memberUsage = usageBar(members, maxUsers);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">

      <h3 className="text-xs tracking-[4px] uppercase text-blue-600 font-bold mb-8">
        Usage
      </h3>

      <div>

        <div className="flex justify-between mb-2">
          <span className="font-medium">Projects</span>
          <span className="text-slate-500">{projectUsage.label}</span>
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-slate-500 rounded-full" style={{ width: `${projectUsage.pct}%` }}></div>
        </div>

      </div>

      <div className="mt-8">

        <div className="flex justify-between mb-2">
          <span className="font-medium">Team Members</span>
          <span className="text-slate-500">{memberUsage.label}</span>
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-slate-500 rounded-full" style={{ width: `${memberUsage.pct}%` }}></div>
        </div>

      </div>

    </div>
  );
}

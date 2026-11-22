'use client';
import { tr } from '@/i18n';

// =============================================================================
// Project health badge (On Track / At Risk / Delayed) — clickable.
// Opens a panel explaining WHY, using the same rules as the backend
// (interior-os-backend/src/services/project-metrics.service.ts):
//   Delayed  = a milestone marked delayed, or past the project end date and < 100%
//   At Risk  = an overdue task (not completed, end date passed), or an open risk scoring 6+
// Each reason lists the actual records and links to their section.
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarX, CheckSquare, ChevronRight, Flag, ShieldAlert, X, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useCanOpenSection } from '@/features/interior-new/lib/projectSectionAccess';

interface Props {
  projectId: string;
  project: any;
}

interface Reason {
  key: string;
  icon: React.ElementType;
  tone: string;
  title: string;
  hint: string;
  section?: string;
  rows: { id: string; label: string; sub?: string }[];
}

const DAY = 24 * 60 * 60 * 1000;
const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const daysAgo = (d: Date) => Math.max(1, Math.floor((Date.now() - d.getTime()) / DAY));
const listOf = (r: PromiseSettledResult<any>): any[] => {
  if (r.status !== 'fulfilled' || !r.value) return [];
  const d = r.value?.data ?? r.value;
  return (Array.isArray(d) ? d : []).filter((x: any) => x && !x.isDeleted);
};

export function ProjectHealthBadge({ projectId, project }: Props) {
  const router = useRouter();
  const canOpen = useCanOpenSection(projectId);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const health: string = project?.health || 'on-track';
  const allowed = {
    tasks: canOpen('tasks') === true,
    milestones: canOpen('milestones') === true,
    risks: canOpen('risks') === true,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['interior-project-health-reasons', projectId, allowed.tasks, allowed.milestones, allowed.risks],
    enabled: open && Boolean(projectId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      const skip = Promise.resolve(null);
      const [t, m, r] = await Promise.allSettled([
        allowed.tasks ? interiorProjectService.getTasks(projectId) : skip,
        allowed.milestones ? interiorProjectService.getMilestones(projectId) : skip,
        allowed.risks ? interiorProjectService.getRisks(projectId) : skip,
      ]);
      return { tasks: listOf(t), milestones: listOf(m), risks: listOf(r) };
    },
  });

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const reasons: Reason[] = [];
  const now = new Date();

  const end = project?.endDate ? new Date(project.endDate) : null;
  if (end && end < now && Number(project?.progress ?? 0) < 100 && project?.status !== 'completed') {
    reasons.push({
      key: 'end', icon: CalendarX, tone: 'text-red-600 bg-red-50',
      title: 'Past the project end date',
      hint: tr('Planned to finish on {{date}} ({{days}} days ago); progress is {{progress}}%. Extend the end date or finish the remaining work.', { date: fmt(end), days: daysAgo(end), progress: project?.progress ?? 0 }),
      section: 'timeline', rows: [],
    });
  }

  if (data) {
    const delayed = data.milestones.filter((m: any) => m.status === 'delayed');
    if (delayed.length) {
      reasons.push({
        key: 'ms', icon: Flag, tone: 'text-red-600 bg-red-50',
        title: tr('{{count}} delayed milestone(s)', { count: delayed.length }),
        hint: 'Milestones marked delayed. Mark them achieved once done.',
        section: 'milestones',
        rows: delayed.map((m: any) => ({
          id: String(m._id), label: m.name,
          sub: m.dueDate ? tr('Due {{date}}', { date: fmt(new Date(m.dueDate)) }) : undefined,
        })),
      });
    }

    const overdue = data.tasks
      .filter((t: any) => t.status !== 'completed' && t.endDate && new Date(t.endDate) < now)
      .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    if (overdue.length) {
      reasons.push({
        key: 'tasks', icon: CheckSquare, tone: 'text-amber-700 bg-amber-50',
        title: tr('{{count}} overdue task(s)', { count: overdue.length }),
        hint: 'Not completed and past their end date. Complete them or move their dates.',
        section: 'tasks',
        rows: overdue.map((t: any) => ({
          id: String(t._id ?? t.id), label: t.name || t.title,
          sub: tr('{{days}} days overdue · {{status}}', { days: daysAgo(new Date(t.endDate)), status: tr(String(t.status || '').replace('_', ' ')) }),
        })),
      });
    }

    const risky = data.risks
      .filter((r: any) => r.status === 'open' && Number(r.score || 0) >= 6)
      .sort((a: any, b: any) => Number(b.score) - Number(a.score));
    if (risky.length) {
      reasons.push({
        key: 'risks', icon: ShieldAlert, tone: 'text-amber-700 bg-amber-50',
        title: tr('{{count}} high-score open risk(s)', { count: risky.length }),
        hint: 'Open risks scoring 6 or more out of 9. Mitigate or close them.',
        section: 'risks',
        rows: risky.map((r: any) => ({
          id: String(r._id), label: r.description,
          sub: r.mitigationPlan ? tr('Score {{score}}/9', { score: r.score }) : tr('Score {{score}}/9 · no mitigation plan', { score: r.score }),
        })),
      });
    }
  }

  const hiddenSections = (['tasks', 'milestones', 'risks'] as const).filter((k) => canOpen(k) === false);
  const go = (section?: string) => {
    if (!section) return;
    setOpen(false);
    router.push(`/interior-new/projects/${projectId}/${section}`);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={tr("Why this status?")}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 text-[0.6875rem] sm:text-xs font-semibold rounded-full border capitalize cursor-pointer transition-shadow hover:shadow-sm',
          health === 'on-track' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
          health === 'at-risk' && 'bg-amber-50 text-amber-700 border-amber-200',
          health === 'delayed' && 'bg-red-50 text-red-700 border-red-200'
        )}
      >
        {health !== 'on-track' && <AlertTriangle className="w-3 h-3" />}
        {project?.healthLabel || health.replace('-', ' ')}
        <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <div className="absolute start-0 sm:left-auto sm:end-0 mt-2 z-50 w-[min(92vw,380px)] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl">
          <div className="flex items-start justify-between gap-2 p-3.5 border-b border-[hsl(var(--border))]">
            <div>
              <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                {health === 'on-track' ? tr("Project is on track") : tr("Why \"{{value}}\"?", { value: project?.healthLabel || health })}
              </p>
              <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] mt-0.5">
                {health === 'delayed'
                  ? tr("Delayed = a milestone is delayed, or the end date has passed.")
                  : health === 'at-risk'
                    ? tr("At Risk = an overdue task, or an open risk scoring 6+.")
                    : tr("No overdue tasks, delayed milestones or high-score risks.")}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2.5 space-y-2.5">
            {isLoading && !data ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-[hsl(var(--muted-foreground))]">
                <Loader2 className="w-4 h-4 animate-spin" />{tr(" Checking what's causing this…")}
              </div>
            ) : reasons.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-1.5 py-5 px-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                  {health === 'on-track' ? tr("Nothing needs attention") : tr("Nothing is flagged any more")}
                </p>
                {health !== 'on-track' && (
                  <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))]">
                    {tr("The issues seem resolved. Refresh the page to update the status.")}
                  </p>
                )}
              </div>
            ) : (
              reasons.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.key} className="rounded-lg border border-[hsl(var(--border))]">
                    <button
                      type="button"
                      onClick={() => go(r.section)}
                      className="w-full flex items-start gap-2.5 p-2.5 text-start hover:bg-[hsl(var(--muted)/0.4)] rounded-t-lg"
                    >
                      <span className={cn('shrink-0 w-7 h-7 rounded-md flex items-center justify-center', r.tone)}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-[hsl(var(--foreground))]">{tr(r.title)}</span>
                        <span className="block text-[0.6875rem] text-[hsl(var(--muted-foreground))] mt-0.5">{tr(r.hint)}</span>
                      </span>
                      <span className="shrink-0 text-[0.6875rem] font-semibold text-[hsl(var(--primary))] whitespace-nowrap mt-0.5">{tr("Open →")}</span>
                    </button>
                    {r.rows.length > 0 && (
                      <ul className="border-t border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                        {r.rows.slice(0, 5).map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              onClick={() => go(r.section)}
                              className="w-full text-start px-3 py-1.5 hover:bg-[hsl(var(--muted)/0.4)]"
                            >
                              <span className="block text-[0.6875rem] font-medium text-[hsl(var(--foreground))] truncate">{tr(row.label)}</span>
                              {row.sub && <span className="block text-[0.625rem] text-[hsl(var(--muted-foreground))] capitalize">{tr(row.sub)}</span>}
                            </button>
                          </li>
                        ))}
                        {r.rows.length > 5 && (
                          <li>
                            <button type="button" onClick={() => go(r.section)} className="w-full text-start px-3 py-1.5 text-[0.6875rem] font-semibold text-[hsl(var(--primary))] hover:underline">
                              +{r.rows.length - 5}{tr(" more")}
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
            {hiddenSections.length > 0 && health !== 'on-track' && (
              <p className="text-[0.625rem] text-[hsl(var(--muted-foreground))] px-1">
                {tr("You don't have access to ")}{hiddenSections.join(', ')}{tr(", so items there aren't listed.")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

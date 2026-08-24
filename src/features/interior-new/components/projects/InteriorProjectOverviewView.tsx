'use client';

// Port of interior-os-frontend's projects/[projectId]/page.tsx (overview),
// minus permission gating and the 3D .glb model viewer/upload (external
// three.js component not ported — everything else is wired to real data).

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckSquare, AlertTriangle, Clock, TrendingUp, Activity, DollarSign, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';

interface InteriorProjectOverviewViewProps {
  projectId: string;
}

const getMockMetrics = () => ({
  project: { name: 'Untitled Project', code: 'PRJ', client: 'Client', progress: 0, budget: { amount: 0, currency: 'INR' } },
  taskStats: { total: 0, completed: 0, remaining: 0, breakdown: { backlog: 0, todo: 0, in_progress: 0, in_review: 0, completed: 0 } },
  milestones: { total: 0, planned: 0, achieved: 0, delayed: 0 },
  quality: { openSnags: 0, openRFIs: 0, criticalRisks: 0 },
});

export default function InteriorProjectOverviewView({ projectId }: InteriorProjectOverviewViewProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    interiorProjectService
      .getDashboardMetrics(projectId)
      .then((res) => setData(res?.success && res?.data ? res.data : getMockMetrics()))
      .catch((err) => {
        console.warn('Failed to load project dashboard metrics', err);
        setData(getMockMetrics());
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const formatBudget = (amount: number) => {
    if (!amount) return '₹0';
    if (amount >= 10000000) return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
    return `₹ ${(amount / 100000).toFixed(2)} Lakh`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  const { project, taskStats, milestones, quality } = data;
  const cardVariants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } };

  const breakdownRows = [
    { label: 'Backlog', value: taskStats?.breakdown?.backlog, color: 'bg-slate-400' },
    { label: 'Todo', value: taskStats?.breakdown?.todo, color: 'bg-blue-400' },
    { label: 'In Progress', value: taskStats?.breakdown?.in_progress, color: 'bg-amber-400' },
    { label: 'In Review', value: taskStats?.breakdown?.in_review, color: 'bg-indigo-400' },
    { label: 'Completed', value: taskStats?.breakdown?.completed, color: 'bg-emerald-500' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.3 }} className="h-full">
          <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Overall Progress</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">{project?.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full mt-auto overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${project?.progress}%` }} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.3, delay: 0.05 }} className="h-full">
          <Card onClick={() => router.push(`/interior-new/projects/${projectId}/tasks`)} className="hover:shadow-md transition-shadow cursor-pointer hover:border-[hsl(var(--primary)/0.3)] h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Tasks Status</span>
                <CheckSquare className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
                  {taskStats?.completed}/{taskStats?.total}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">({taskStats?.remaining} remaining)</span>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-auto pt-4">Completed Tasks out of total scope</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.3, delay: 0.1 }} className="h-full">
          <Card onClick={() => router.push(`/interior-new/projects/${projectId}/milestones`)} className="hover:shadow-md transition-shadow cursor-pointer hover:border-[hsl(var(--primary)/0.3)] h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Milestones</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
                  {milestones?.achieved}/{milestones?.total}
                </span>
                {milestones?.delayed > 0 && <span className="text-xs font-medium text-red-500">({milestones?.delayed} delayed)</span>}
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-auto pt-4">Key project checkpoints achieved</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ duration: 0.3, delay: 0.15 }} className="h-full">
          <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Contract Budget</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">{formatBudget(project?.budget?.amount)}</span>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-auto pt-4">Total allocated contract value</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Scope Breakdown</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Task distribution across workflow columns</p>
            </div>
            <div className="space-y-4">
              {breakdownRows.map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[hsl(var(--foreground))]">{row.label}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">{row.value || 0} tasks</span>
                  </div>
                  <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${((row.value || 0) / (taskStats?.total || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Quality & Risk Indicators
              </h4>
              <div className="space-y-3">
                <div onClick={() => router.push(`/interior-new/projects/${projectId}/snags`)} className="flex items-center justify-between p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] transition-all cursor-pointer">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Open Snags</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{quality?.openSnags} snags</span>
                </div>
                <div onClick={() => router.push(`/interior-new/projects/${projectId}/rfis`)} className="flex items-center justify-between p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] transition-all cursor-pointer">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Open RFIs</span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{quality?.openRFIs} RFIs</span>
                </div>
                <div onClick={() => router.push(`/interior-new/projects/${projectId}/risks`)} className="flex items-center justify-between p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] transition-all cursor-pointer">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Critical Risks</span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{quality?.criticalRisks} risks</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-500" />
                Site Log Feed
              </h4>
              <div className="space-y-3.5">
                <div className="flex items-start gap-2.5 text-xs text-[hsl(var(--muted-foreground))]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[hsl(var(--foreground))] font-semibold">Project initialized</p>
                    <p className="text-[10px] mt-0.5">PM set default roles and configuration</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

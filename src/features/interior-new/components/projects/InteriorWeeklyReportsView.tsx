'use client';

// =============================================================================
// Sky-Lite Web — Interior-New Weekly Reports View
// Port of interior-os-frontend's projects/[projectId]/weekly-reports/page.tsx,
// backed by interiorProjectService instead of that app's project.service.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  X,
  Download,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';

interface InteriorWeeklyReportsViewProps {
  projectId: string;
}

export default function InteriorWeeklyReportsView({ projectId }: InteriorWeeklyReportsViewProps) {
  const toast = useToast();

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getWeeklyReports(projectId);
      if (res.success && res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
      toast.error('Failed to fetch weekly report list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Please specify both start and end dates');
      return;
    }

    try {
      setGenerating(true);
      const res = await interiorProjectService.createWeeklyReport(projectId, {
        weekStart: startDate,
        weekEnd: endDate,
      });
      if (res.success) {
        toast.success('Weekly Report generated successfully!');
        setIsModalOpen(false);
        setStartDate('');
        setEndDate('');
        fetchReports();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Weekly Progress Reports (WPR)</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Auto-generate progress summaries, delay logs, active risks, and next week plan.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No weekly progress reports generated yet. Click &quot;Generate Report&quot; to auto-compile this week&apos;s status.
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <Card key={report._id} className="overflow-hidden hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <div className="p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <span className="font-semibold text-sm">
                    Weekly Report: {new Date(report.weekStart).toLocaleDateString('en-IN')} - {new Date(report.weekEnd).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => toast.success('PDF Download started (simulated)')}>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export PDF
                </Button>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Completed vs Delayed */}
                  <div className="space-y-4">
                    {/* Completed */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Completed Activities
                      </h4>
                      {report.completedActivities?.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">No activities completed during this period.</p>
                      ) : (
                        <ul className="text-xs space-y-1.5 list-disc list-inside text-[hsl(var(--foreground))]">
                          {report.completedActivities?.map((act: string, i: number) => <li key={i}>{act}</li>)}
                        </ul>
                      )}
                    </div>

                    {/* Delayed */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-4 h-4 text-red-500" />
                        Delayed Milestones / Tasks
                      </h4>
                      {report.delayedActivities?.length === 0 ? (
                        <p className="text-xs text-emerald-600 font-medium">Zero delays logged. On track!</p>
                      ) : (
                        <ul className="text-xs space-y-1.5 list-disc list-inside text-[hsl(var(--foreground))]">
                          {report.delayedActivities?.map((act: string, i: number) => <li key={i}>{act}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Risks vs Next Week Plan */}
                  <div className="space-y-4">
                    {/* Risks */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Identified Risks
                      </h4>
                      {report.risks?.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">No critical risks flagged.</p>
                      ) : (
                        <ul className="text-xs space-y-1.5 list-disc list-inside text-[hsl(var(--foreground))]">
                          {report.risks?.map((act: string, i: number) => <li key={i}>{act}</li>)}
                        </ul>
                      )}
                    </div>

                    {/* Next Week Plan */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Next Week Planned Scope
                      </h4>
                      {report.nextWeekPlan?.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">No plan defined.</p>
                      ) : (
                        <ul className="text-xs space-y-1.5 list-disc list-inside text-[hsl(var(--foreground))]">
                          {report.nextWeekPlan?.map((act: string, i: number) => <li key={i}>{act}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generation Wizard Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Auto-compile Weekly Report
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGenerateReport}>
                <div className="p-5 space-y-4">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Select a weekly timeline boundary. The system will auto-scan completed tasks, milestone delay logs, and risks registered in this interval.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Start Date</label>
                      <Input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">End Date</label>
                      <Input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={generating}>
                    {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Compile Report
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

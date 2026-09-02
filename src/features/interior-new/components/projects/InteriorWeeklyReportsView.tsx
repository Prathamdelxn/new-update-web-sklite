'use client';

// =============================================================================
// Sky-Lite Web — Weekly Progress Reports (WPR) View
// Live multi-source compilation, interactive report generation, management & PDF export
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
  Printer,
  Trash2,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  CalendarDays,
  Target,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { downloadWprPdf, printWpr, WPRData } from '@/features/interior-new/utils/wprPdfGenerator';

interface InteriorWeeklyReportsViewProps {
  projectId: string;
}

export default function InteriorWeeklyReportsView({ projectId }: InteriorWeeklyReportsViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [project, setProject] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Live project entities
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);

  // Generation Modal Form States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Editable lists for the report being generated
  const [completedActivities, setCompletedActivities] = useState<string[]>([]);
  const [delayedActivities, setDelayedActivities] = useState<string[]>([]);
  const [reportRisks, setReportRisks] = useState<string[]>([]);
  const [nextWeekPlan, setNextWeekPlan] = useState<string[]>([]);

  // Temp input states for adding custom items in modal
  const [newCompleted, setNewCompleted] = useState('');
  const [newDelayed, setNewDelayed] = useState('');
  const [newRisk, setNewRisk] = useState('');
  const [newPlan, setNewPlan] = useState('');

  // Load live project data & weekly reports
  const loadData = async () => {
    try {
      setLoading(true);
      const [projRes, repRes, taskRes, mileRes, riskRes] = await Promise.allSettled([
        interiorProjectService.getProjectDetails(projectId),
        interiorProjectService.getWeeklyReports(projectId),
        interiorProjectService.getTasks(projectId),
        interiorProjectService.getMilestones(projectId),
        interiorProjectService.getRisks(projectId),
      ]);

      if (projRes.status === 'fulfilled' && projRes.value?.data) {
        setProject(projRes.value.data);
      }
      if (repRes.status === 'fulfilled' && repRes.value?.data) {
        setReports(repRes.value.data || []);
      }
      if (taskRes.status === 'fulfilled' && taskRes.value?.data) {
        setTasks(taskRes.value.data || []);
      }
      if (mileRes.status === 'fulfilled' && mileRes.value?.data) {
        setMilestones(mileRes.value.data || []);
      }
      if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
        setRisks(riskRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load weekly reports:', err);
      toast.error('Failed to load Weekly Progress Reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  // Set default weekly boundaries (Monday to Sunday)
  const setQuickDatePreset = (preset: 'this_week' | 'last_week' | 'last_7_days') => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday

    if (preset === 'this_week') {
      const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today);
      monday.setDate(today.getDate() + distanceToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(sunday.toISOString().split('T')[0]);
      autoScanTimeline(monday, sunday);
    } else if (preset === 'last_week') {
      const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() + distanceToMon - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);

      setStartDate(lastMonday.toISOString().split('T')[0]);
      setEndDate(lastSunday.toISOString().split('T')[0]);
      autoScanTimeline(lastMonday, lastSunday);
    } else if (preset === 'last_7_days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
      autoScanTimeline(sevenDaysAgo, today);
    }
  };

  // Auto-scan live project entities based on selected date range
  const autoScanTimeline = (start?: Date, end?: Date) => {
    const s = start || (startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000));
    const e = end || (endDate ? new Date(endDate) : new Date());

    // 1. Completed Tasks in this period
    const done = tasks
      .filter((t) => t.status === 'completed')
      .map((t) => `${t.name} (${t.packageId?.trade || 'Site Activity'})`);

    // 2. Delayed Milestones / Tasks
    const delayed = milestones
      .filter((m) => m.status === 'delayed' || (m.dueDate && new Date(m.dueDate) < e && m.status !== 'completed'))
      .map((m) => `Milestone: ${m.name} [Target Date: ${new Date(m.dueDate).toLocaleDateString('en-IN')}]`);

    // 3. Open Risks
    const openRisks = risks
      .filter((r) => r.status === 'open')
      .map((r) => `${r.title || r.description} (${r.severity || 'Medium'} impact)`);

    // 4. Next Week Target Plan
    const upcoming = tasks
      .filter((t) => t.status === 'todo' || (t.status === 'in_progress' && (t.progress || 0) < 100))
      .slice(0, 5)
      .map((t) => `Execute ${t.name} [${t.packageId?.trade || 'Trade'}]`);

    setCompletedActivities(done.length > 0 ? done : ['Site initial inspection & work area layout verification']);
    setDelayedActivities(delayed.length > 0 ? delayed : []);
    setReportRisks(openRisks.length > 0 ? openRisks : []);
    setNextWeekPlan(upcoming.length > 0 ? upcoming : ['Continue baseline scheduled activities for upcoming trades']);
  };

  // Open modal with pre-scanned data
  const handleOpenModal = () => {
    setQuickDatePreset('this_week');
    setIsModalOpen(true);
  };

  // Submit and save weekly report
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
        completedActivities: completedActivities.filter(Boolean),
        delayedActivities: delayedActivities.filter(Boolean),
        risks: reportRisks.filter(Boolean),
        nextWeekPlan: nextWeekPlan.filter(Boolean),
      });

      if (res?.success) {
        toast.success('Weekly Progress Report compiled & saved successfully');
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to compile report');
    } finally {
      setGenerating(false);
    }
  };

  // Export PDF
  const handleDownloadPdf = async (report: any) => {
    try {
      setDownloadingId(report._id);
      await downloadWprPdf(report, project);
      toast.success('WPR PDF generated & downloaded successfully');
    } catch (err: any) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // Print Report
  const handlePrint = (report: any) => {
    printWpr(report, project);
  };

  // Delete Report
  const handleDeleteReport = async (report: any) => {
    const sDate = new Date(report.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const eDate = new Date(report.weekEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const ok = await confirm({
      title: 'Delete Weekly Progress Report',
      message: `Are you sure you want to delete the Weekly Report for ${sDate} - ${eDate}? This action cannot be undone.`,
      confirmText: 'Delete Report',
      type: 'danger',
    });

    if (!ok) return;

    try {
      setDeletingId(report._id);
      await interiorProjectService.deleteWeeklyReport(projectId, report._id);
      toast.success('Weekly Report deleted successfully');
      setReports((prev) => prev.filter((r) => r._id !== report._id));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Weekly Progress Reports (WPR)</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              SkyStruct Lite Standard
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Official executive weekly summaries, milestone tracking, delay logs, and next-week target planning for{' '}
            <strong className="text-[hsl(var(--foreground))]">{project?.name || 'Project'}</strong>.
          </p>
        </div>

        <Button onClick={handleOpenModal} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
          <Plus className="w-4 h-4" />
          Compile Weekly Report
        </Button>
      </div>

      {/* Loading & Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading Weekly Reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[hsl(var(--foreground))] mb-1">No Weekly Reports Compiled Yet</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto mb-6">
            Auto-aggregate this week&apos;s finished tasks, delayed milestones, identified risks, and next week plan into an official executive WPR sheet.
          </p>
          <Button onClick={handleOpenModal} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4" />
            Compile First Weekly Report
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
            const startFormatted = new Date(report.weekStart).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            });
            const endFormatted = new Date(report.weekEnd).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            const completedCount = report.completedActivities?.length || 0;
            const delayedCount = report.delayedActivities?.length || 0;
            const riskCount = report.risks?.length || 0;
            const nextCount = report.nextWeekPlan?.length || 0;

            return (
              <Card
                key={report._id}
                className="overflow-hidden border border-[hsl(var(--border))] hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-[hsl(var(--border))] bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-100/60 text-blue-600 font-bold flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      <span className="text-xs sm:text-sm font-semibold">
                        Weekly Cycle: {startFormatted} - {endFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(report)}
                      className="gap-1.5 text-xs h-8 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownloadPdf(report)}
                      disabled={downloadingId === report._id}
                      className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      {downloadingId === report._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Export PDF</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReport(report)}
                      disabled={deletingId === report._id}
                      className="text-xs h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer"
                      title="Delete Report"
                    >
                      {deletingId === report._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <CardContent className="p-5 sm:p-6 space-y-5">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Completed Work</p>
                      <p className="text-base font-extrabold text-emerald-950 mt-0.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {completedCount} tasks
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                      <p className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Delays & Deviations</p>
                      <p className="text-base font-extrabold text-rose-950 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-rose-600" />
                        {delayedCount} items
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                      <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Active Risks</p>
                      <p className="text-base font-extrabold text-amber-950 mt-0.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        {riskCount} risks
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                      <p className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Next Week Target</p>
                      <p className="text-base font-extrabold text-blue-950 mt-0.5 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-blue-600" />
                        {nextCount} activities
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Detail Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Left Column: Completed & Delays */}
                    <div className="space-y-4">
                      {/* Completed */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2">
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          1. Completed Activities & Milestones ({completedCount})
                        </h4>
                        {completedCount === 0 ? (
                          <p className="text-xs text-slate-400 italic">No activities finalized in this timeframe.</p>
                        ) : (
                          <ul className="text-xs space-y-1.5">
                            {report.completedActivities.map((act: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Delayed */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2">
                        <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-rose-600" />
                          2. Delayed Milestones & Blockers ({delayedCount})
                        </h4>
                        {delayedCount === 0 ? (
                          <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Zero milestone delays logged. Project timeline on track!
                          </p>
                        ) : (
                          <ul className="text-xs space-y-1.5">
                            {report.delayedActivities.map((act: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-rose-900 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Risks & Next Week Target */}
                    <div className="space-y-4">
                      {/* Risks */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2">
                        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          3. Identified Risks & Quality Notes ({riskCount})
                        </h4>
                        {riskCount === 0 ? (
                          <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No critical risks flagged for this period.
                          </p>
                        ) : (
                          <ul className="text-xs space-y-1.5">
                            {report.risks.map((risk: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-amber-900 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Next Week Plan */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2">
                        <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          4. Next Week Planned Target Scope ({nextCount})
                        </h4>
                        {nextCount === 0 ? (
                          <p className="text-xs text-slate-400 italic">No specific plan logged.</p>
                        ) : (
                          <ul className="text-xs space-y-1.5">
                            {report.nextWeekPlan.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-blue-950 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPILE WEEKLY REPORT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Compile Weekly Progress Report</h3>
                    <p className="text-xs text-slate-500">
                      SkyStruct Lite Standard • {project?.name || 'Project'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateReport} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                  {/* Quick Presets & Date Inputs */}
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Weekly Timeline Period
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuickDatePreset('this_week')}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          This Week
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickDatePreset('last_week')}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          Last Week
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickDatePreset('last_7_days')}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          Last 7 Days
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Week Start Date</label>
                        <Input
                          required
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            autoScanTimeline(new Date(e.target.value), endDate ? new Date(endDate) : undefined);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700">Week End Date</label>
                        <Input
                          required
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            autoScanTimeline(startDate ? new Date(startDate) : undefined, new Date(e.target.value));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1. Completed Activities */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        1. Completed Activities & Milestones ({completedActivities.length})
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add completed task or milestone..."
                        value={newCompleted}
                        onChange={(e) => setNewCompleted(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCompleted.trim()) {
                            e.preventDefault();
                            setCompletedActivities([...completedActivities, newCompleted.trim()]);
                            setNewCompleted('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newCompleted.trim()) {
                            setCompletedActivities([...completedActivities, newCompleted.trim()]);
                            setNewCompleted('');
                          }
                        }}
                        disabled={!newCompleted.trim()}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {completedActivities.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs">
                          <span className="truncate flex-1 font-medium text-emerald-950">{item}</span>
                          <button
                            type="button"
                            onClick={() => setCompletedActivities(completedActivities.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Delayed Milestones */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        2. Delayed Milestones & Critical Blockers ({delayedActivities.length})
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add milestone delay or schedule blocker..."
                        value={newDelayed}
                        onChange={(e) => setNewDelayed(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newDelayed.trim()) {
                            e.preventDefault();
                            setDelayedActivities([...delayedActivities, newDelayed.trim()]);
                            setNewDelayed('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newDelayed.trim()) {
                            setDelayedActivities([...delayedActivities, newDelayed.trim()]);
                            setNewDelayed('');
                          }
                        }}
                        disabled={!newDelayed.trim()}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {delayedActivities.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-xs">
                          <span className="truncate flex-1 font-medium text-rose-950">{item}</span>
                          <button
                            type="button"
                            onClick={() => setDelayedActivities(delayedActivities.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Identified Risks */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        3. Identified Risks & Quality Notes ({reportRisks.length})
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add site risk, procurement bottleneck, or design delay..."
                        value={newRisk}
                        onChange={(e) => setNewRisk(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newRisk.trim()) {
                            e.preventDefault();
                            setReportRisks([...reportRisks, newRisk.trim()]);
                            setNewRisk('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newRisk.trim()) {
                            setReportRisks([...reportRisks, newRisk.trim()]);
                            setNewRisk('');
                          }
                        }}
                        disabled={!newRisk.trim()}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {reportRisks.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs">
                          <span className="truncate flex-1 font-medium text-amber-950">{item}</span>
                          <button
                            type="button"
                            onClick={() => setReportRisks(reportRisks.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Next Week Target Plan */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        4. Next Week Planned Target Scope ({nextWeekPlan.length})
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add targeted work package or milestone for next week..."
                        value={newPlan}
                        onChange={(e) => setNewPlan(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newPlan.trim()) {
                            e.preventDefault();
                            setNextWeekPlan([...nextWeekPlan, newPlan.trim()]);
                            setNewPlan('');
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newPlan.trim()) {
                            setNextWeekPlan([...nextWeekPlan, newPlan.trim()]);
                            setNewPlan('');
                          }
                        }}
                        disabled={!newPlan.trim()}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {nextWeekPlan.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-xs">
                          <span className="truncate flex-1 font-medium text-blue-950">{item}</span>
                          <button
                            type="button"
                            onClick={() => setNextWeekPlan(nextWeekPlan.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => autoScanTimeline()}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Re-scan Live Project
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" size="sm" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Save & Compile Report
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

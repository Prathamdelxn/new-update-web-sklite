'use client';
import { tr, getLang } from '@/i18n';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, CheckCircle2, Clock, MessageSquare,
  User, Image as ImageIcon, X, ChevronRight, Loader2,
  TrendingUp, Activity, Download, Mail, FileText, Wrench, AlertCircle, XOctagon
} from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthContext';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { hasProjectPermission } from '@/lib/permissions';
import { exportPdf, getPdfOrg, pdfHeaderHtml, pdfSlug, PDF_BASE_CSS, PDF_TERMS } from '@/lib/pdf/pdfExport';

interface ReportsTabProps {
  projectId: string;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
  bg,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  bg: string;
  sub?: string;
}) => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5 min-w-0 transition-colors duration-200 hover:border-blue-200 shadow-none">
    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border', bg)}>
      <Icon className={cn('w-5 h-5', accent)} />
    </div>
    <div className="min-w-0">
      <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{tr(value)}</div>
      <div className="text-xs text-slate-500 font-medium truncate">{tr(label)}</div>
      {sub && <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">{tr(sub)}</div>}
    </div>
  </div>
);

export const ReportsTab: React.FC<ReportsTabProps> = ({ projectId }) => {
  const { project: contextProject } = useProjectContext();
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'Daily' | 'Monthly'>('Daily');
  const [milestones, setMilestones] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const toast = useToast();

  const getMemberName = (assignedTo: any) => {
    if (!assignedTo) return 'Unassigned';
    const id = assignedTo?._id || assignedTo;
    const member = members.find(m => m._id === id || m.id === id);
    return member?.name || assignedTo?.name || 'Assigned User';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          api.get(`/projects/${projectId}/milestones`),
          api.get(`/users?projectId=${projectId}`),
          api.get(`/projects/${projectId}`),
          api.get(`/projects/${projectId}/issues`),
          api.get(`/projects/${projectId}/snags`)
        ]);

        results.forEach(res => {
          if (res.status === 'rejected' && res.reason?.response?.status !== 403) {
            console.error(res.reason);
          }
        });

        const getData = (res: any) => res.status === 'fulfilled' ? res.value.data : null;
        const [msRes, usersRes, projectRes, issuesRes, snagsRes] = results;

        const msDataRaw = getData(msRes);
        const msData = Array.isArray(msDataRaw)
          ? msDataRaw
          : Array.isArray(msDataRaw?.milestones)
            ? msDataRaw.milestones
            : [];
        setMilestones(msData);

        const usersData = getData(usersRes);
        const rawUsers = Array.isArray(usersData) ? usersData : [];
        setMembers(rawUsers);

        setProject(getData(projectRes));
        
        const issuesData = getData(issuesRes);
        setIssues(Array.isArray(issuesData) ? issuesData : []);
        
        const snagsData = getData(snagsRes);
        setSnags(Array.isArray(snagsData) ? snagsData : []);
      } catch (err: any) {
        if (err.response?.status !== 403) console.error(err);
        toast.error(tr("Failed to load reports data"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const { chartData, groupedTasks, totalFiltered, rangeLogs, rangeIssues, rangeSnags } = useMemo(() => {
    const allCompletedTasks: any[] = [];
    milestones.forEach(m => {
      if (m.tasks) {
        m.tasks.forEach((t: any) => {
          if (t.isCompleted) {
            allCompletedTasks.push({
              ...t,
              milestoneName: m.name,
              completedAtDate: new Date(t.completedAt || m.updatedAt || new Date())
            });
          }
        });
      }
    });

    const startLimit = new Date();
    if (reportType === 'Daily') {
      startLimit.setDate(startLimit.getDate() - 7);
    } else {
      startLimit.setMonth(startLimit.getMonth() - 6);
    }
    startLimit.setHours(0, 0, 0, 0);

    const endLimit = new Date();
    endLimit.setHours(23, 59, 59, 999);

    // Filter tasks
    const grouped: Record<string, any[]> = {};
    let tFiltered = 0;
    const recentTasks = allCompletedTasks.filter(t => t.completedAtDate >= startLimit && t.completedAtDate <= endLimit);
    recentTasks.forEach(t => {
      if (!grouped[t.milestoneName]) grouped[t.milestoneName] = [];
      grouped[t.milestoneName].push(t);
      tFiltered++;
    });

    // Chart data calculation
    const cData: { value: number; label: string }[] = [];
    if (reportType === 'Daily') {
      // Last 7 days chart points
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const count = allCompletedTasks.filter(t => 
          t.completedAtDate.getDate() === d.getDate() && 
          t.completedAtDate.getMonth() === d.getMonth() &&
          t.completedAtDate.getFullYear() === d.getFullYear()
        ).length;
        cData.push({ value: count, label: dateStr });
      }
    } else {
      // Last 6 months chart points
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const count = allCompletedTasks.filter(t => 
          t.completedAtDate.getMonth() === d.getMonth() &&
          t.completedAtDate.getFullYear() === d.getFullYear()
        ).length;
        cData.push({ value: count, label: monthStr });
      }
    }

    // Filter logs
    const logs = (project?.auditTrail || [])
      .filter((log: any) => {
        const d = new Date(log.timestamp);
        return d >= startLimit && d <= endLimit;
      })
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter issues
    const filteredIssues = issues
      .filter((issue: any) => {
        const d = new Date(issue.createdAt);
        return d >= startLimit && d <= endLimit;
      })
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Filter snags
    const filteredSnags = snags
      .filter((snag: any) => {
        const d = new Date(snag.createdAt);
        return d >= startLimit && d <= endLimit;
      })
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      chartData: cData,
      groupedTasks: grouped,
      totalFiltered: tFiltered,
      rangeLogs: logs,
      rangeIssues: filteredIssues,
      rangeSnags: filteredSnags
    };
  }, [milestones, reportType, project, issues, snags]);

  const dateRangeLabel = useMemo(() => {
    const start = new Date();
    if (reportType === 'Daily') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 6);
    }
    const end = new Date();
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', opt)} – ${end.toLocaleDateString('en-US', opt)}`;
  }, [reportType]);

  const handleExportReport = () => {
    if (Object.keys(groupedTasks).length === 0) {
      toast.error(tr("No report data available to export"));
      return;
    }

    const headers = ['Milestone Name', 'Task Title', 'Completed By', 'Completed Date', 'Completion Note'].map((h) => tr(h));
    const rows: any[] = [];

    Object.entries(groupedTasks).forEach(([milestoneName, tasks]) => {
      tasks.forEach((task: any) => {
        const completedDate = new Date(task.completedAtDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const completedBy = getMemberName(task.assignedTo);
        rows.push([
          milestoneName,
          task.title,
          completedBy,
          completedDate,
          task.completionNote || ''
        ]);
      });
    });

    // ﻿: Excel opens UTF-8 (Arabic) CSV correctly
    const csv = '﻿' + [headers, ...rows].map(r =>
      r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(tr("{{reportType}} report exported successfully", { reportType: reportType }));
  };

  const safeFormatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const safeFormatDateTime = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const allCompletedTasks: any[] = [];
      milestones.forEach(m => {
        if (m.tasks) {
          m.tasks.forEach((t: any) => {
            if (t.isCompleted) {
              allCompletedTasks.push({
                ...t,
                milestoneName: m.name,
                completedAtDate: new Date(t.completedAt || m.updatedAt || new Date())
              });
            }
          });
        }
      });

      const startLimit = new Date();
      if (reportType === 'Daily') {
        startLimit.setDate(startLimit.getDate() - 7);
      } else {
        startLimit.setMonth(startLimit.getMonth() - 6);
      }
      startLimit.setHours(0, 0, 0, 0);

      const endLimit = new Date();
      endLimit.setHours(23, 59, 59, 999);

      const recentTasks = allCompletedTasks.filter(t => t.completedAtDate >= startLimit && t.completedAtDate <= endLimit);

      // Generate HTML string matching the PDF format
      const rtl = getLang() === 'ar';
      let htmlContent = `
        <html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}">
        <head>
          <style>
            body { font-family: ${rtl ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Helvetica Neue', Helvetica, Arial, sans-serif"}; padding: 24px; color: #1e293b; line-height: 1.5; direction: ${rtl ? 'rtl' : 'ltr'}; }
            ${rtl ? 'h3, th { letter-spacing: normal !important; text-transform: none !important; } th { text-align: right !important; }' : ''}
            .header { margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
            .project-label { color: #2563eb; font-size: 14px; font-weight: bold; margin: 0; }
            .report-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; }
            .gen-date { color: #64748b; font-size: 11px; margin: 4px 0 0 0; font-weight: 500; }
            h3 { color: #0f172a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 28px; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
            th { background-color: #f8fafc; border: 1.5px solid #e2e8f0; color: #475569; font-weight: bold; padding: 6px 8px; text-align: left; text-transform: uppercase; font-size: 8px; letter-spacing: 0.05em; }
            td { border: 1px solid #e2e8f0; padding: 6px 8px; color: #334155; vertical-align: top; }
            .empty { padding: 12px; text-align: center; color: #94a3b8; font-style: italic; border: 1px dashed #e2e8f0; border-radius: 8px; font-size: 10px; margin-bottom: 16px; }
            .priority-critical { color: #dc2626; font-weight: bold; }
            .priority-high { color: #ea580c; font-weight: bold; }
            .priority-medium { color: #d97706; font-weight: bold; }
            .priority-low { color: #2563eb; font-weight: bold; }
            small { color: #64748b; font-size: 8px; display: block; margin-top: 2px; }
            ${PDF_BASE_CSS}
          </style>
        </head>
        <body>
          ${pdfHeaderHtml({
            docType: reportType === 'Daily' ? tr('Daily Project Report') : tr('Monthly Project Report'),
            subtitle: reportType === 'Daily' ? tr('Last 7 Days') : tr('Last 6 Months'),
            org: getPdfOrg('construction'),
            meta: [
              [tr('Project'), project?.name || contextProject?.name],
              [tr('Generated on'), safeFormatDate(new Date())],
            ],
          })}

          <h3>${tr('Completed Tasks')}</h3>
          ${recentTasks.length === 0 ? `
            <div class="empty">${tr('No tasks completed in this range.')}</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>${tr('Milestone')}</th>
                  <th>${tr('Task Title')}</th>
                  <th>${tr('Completion Date')}</th>
                </tr>
              </thead>
              <tbody>
                ${recentTasks.map(t => `
                  <tr>
                    <td style="font-weight: 600;">${t.milestoneName}</td>
                    <td>${t.title}</td>
                    <td>${safeFormatDate(t.completedAtDate)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <h3>${tr('Reported Issues')}</h3>
          ${rangeIssues.length === 0 ? `
            <div class="empty">${tr('No issues reported in this range.')}</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>${tr('Issue Title')}</th>
                  <th>${tr('Category')}</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported Date</th>
                </tr>
              </thead>
              <tbody>
                ${rangeIssues.map(issue => `
                  <tr>
                    <td>
                      <span style="font-weight: bold; color: #0f172a;">${issue.title}</span>
                      ${issue.description ? `<small>${issue.description}</small>` : ''}
                    </td>
                    <td>${tr(issue.category || 'Other')}</td>
                    <td><span class="priority-${issue.priority.toLowerCase()}">${tr(issue.priority)}</span></td>
                    <td>${tr(issue.status)}</td>
                    <td>${safeFormatDate(issue.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <h3>${tr('Reported Snags')}</h3>
          ${rangeSnags.length === 0 ? `
            <div class="empty">${tr('No snags reported in this range.')}</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>${tr('Snag Title')}</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported Date</th>
                </tr>
              </thead>
              <tbody>
                ${rangeSnags.map(snag => `
                  <tr>
                    <td>
                      <span style="font-weight: bold; color: #0f172a;">${snag.title}</span>
                      ${snag.description ? `<small>${snag.description}</small>` : ''}
                    </td>
                    <td><span class="priority-${snag.priority.toLowerCase()}">${tr(snag.priority)}</span></td>
                    <td>${tr(snag.status)}</td>
                    <td>${safeFormatDate(snag.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <h3>${tr('Activity Logs')}</h3>
          ${rangeLogs.length === 0 ? `
            <div class="empty">${tr('No activity logs in this range.')}</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>${tr('User')}</th>
                  <th>${tr('Role')}</th>
                  <th>${tr('Action')}</th>
                  <th>${tr('Details')}</th>
                  <th>${tr('Date')}</th>
                </tr>
              </thead>
              <tbody>
                ${rangeLogs.map((log: any) => `
                  <tr>
                    <td style="font-weight: bold;">${log.userName || log.user?.name || tr('System')}</td>
                    <td style="text-transform: capitalize;">${log.userRole || log.user?.role || '-'}</td>
                    <td><span style="font-weight: bold; color: #2563eb;">${tr(log.action)}</span></td>
                    <td>${log.details}</td>
                    <td>${safeFormatDate(log.timestamp)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </body>
        </html>
      `;

      await exportPdf({
        html: htmlContent,
        filename: `Project_Report_${pdfSlug(project?.name, 'Details')}_${reportType}.pdf`,
        terms: PDF_TERMS.report,
      });
      toast.success(tr("PDF report downloaded successfully"));
    } catch (err: any) {
      console.error(err);
      toast.error(tr("Failed to download PDF report: {{value}}", { value: err.message || err }));
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleEmailReport = async () => {
    const targetEmail = user?.email;
    if (!targetEmail) {
      toast.error(tr("Could not determine logged-in user email"));
      return;
    }
    setEmailing(true);
    try {
      const startLimit = new Date();
      if (reportType === 'Daily') {
        startLimit.setDate(startLimit.getDate() - 7);
      } else {
        startLimit.setMonth(startLimit.getMonth() - 6);
      }
      startLimit.setHours(0, 0, 0, 0);

      await api.post(`/projects/${projectId}/email-report`, {
        reportType,
        lang: getLang(), // emailed PDF follows the selected language
        startDate: startLimit.toISOString(),
        endDate: new Date().toISOString(),
        customTargetEmail: targetEmail,
      });
      toast.success(tr("Report PDF sent successfully to {{targetEmail}}", { targetEmail: targetEmail }));
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || tr("Failed to send email report"));
    } finally {
      setEmailing(false);
    }
  };

  const hasChartActivity = useMemo(() => {
    return chartData.some(c => c.value > 0);
  }, [chartData]);

  // SVG Chart calculation parameters
  const chartPoints = useMemo(() => {
    const maxVal = Math.max(...chartData.map(c => c.value), 1);
    return chartData.map((item, index) => {
      // chart viewBox: 0 0 700 140
      const x = 45 + (index / Math.max(chartData.length - 1, 1)) * 610;
      const y = hasChartActivity ? 105 - (item.value / maxVal) * 75 : 105;
      return { x, y, value: item.value, label: item.label };
    });
  }, [chartData, hasChartActivity]);

  const linePath = useMemo(() => {
    return chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0 || !hasChartActivity) return '';
    return `${linePath} L ${chartPoints[chartPoints.length - 1].x} 105 L ${chartPoints[0].x} 105 Z`;
  }, [chartPoints, linePath, hasChartActivity]);

  const canViewReports = hasProjectPermission(user, contextProject, 'reports:view');

  if (!canViewReports) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm mt-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <XOctagon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{tr("Access Denied")}</h2>
        <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
          {tr("You do not have the required \"Reports Management\" permission to view this tab.")}
        </p>
      </div>
    );
  }

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-4 sm:space-y-5">
        {/* ── Toolbar & Date Range Controls ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3 shadow-none">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => setReportType('Daily')}
                className={cn(
                  'py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
                  reportType === 'Daily'
                    ? 'bg-white text-blue-600 shadow-none border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {tr("Daily (7 Days)")}
              </button>
              <button
                type="button"
                onClick={() => setReportType('Monthly')}
                className={cn(
                  'py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
                  reportType === 'Monthly'
                    ? 'bg-white text-blue-600 shadow-none border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {tr("Monthly (6 Months)")}
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{tr(dateRangeLabel)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium cursor-pointer shadow-none"
              title={tr("Export Report as CSV")}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{tr("Export CSV")}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium cursor-pointer disabled:opacity-50 shadow-none"
              title={tr("Download Report PDF")}
            >
              {downloadingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{downloadingPDF ? tr("Generating...") : tr("Download PDF")}</span>
            </button>

            <button
              type="button"
              onClick={handleEmailReport}
              disabled={emailing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-xs font-medium cursor-pointer disabled:opacity-50 shadow-none"
              title={tr("Email PDF Report")}
            >
              {emailing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              <span>{emailing ? tr("Sending...") : tr("Email PDF")}</span>
            </button>
          </div>
        </div>

        {/* ── Metric Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={tr("Tasks Completed")}
            value={totalFiltered}
            icon={CheckCircle2}
            accent="text-blue-600"
            bg="bg-blue-50 border-blue-100"
            sub={reportType === 'Daily' ? 'last 7 days' : 'last 6 months'}
          />
          <StatCard
            label={tr("Reported Issues")}
            value={rangeIssues.length}
            icon={AlertCircle}
            accent="text-amber-600"
            bg="bg-amber-50 border-amber-100"
            sub={`${rangeIssues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length} unresolved`}
          />
          <StatCard
            label={tr("Site Snags")}
            value={rangeSnags.length}
            icon={Wrench}
            accent="text-purple-600"
            bg="bg-purple-50 border-purple-100"
            sub={`${rangeSnags.filter(s => s.status !== 'Resolved' && s.status !== 'Closed').length} pending fix`}
          />
          <StatCard
            label={tr("Activity Events")}
            value={rangeLogs.length}
            icon={Activity}
            accent="text-emerald-600"
            bg="bg-emerald-50 border-emerald-100"
            sub="audit trail records"
          />
        </div>

        {/* ── Task Completion Velocity Chart ── */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-none space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">{tr("Task Completion Velocity")}</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {reportType === 'Daily' ? tr("Milestone tasks completed daily over the past 7 days") : tr("Milestone tasks completed monthly over the past 6 months")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                {tr(totalFiltered)} {totalFiltered === 1 ? tr("Task Completed") : tr("Tasks Completed")}
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto scrollbar-hide pt-2">
            <div className="min-w-[540px]">
              <svg viewBox="0 0 700 140" className="w-full h-auto overflow-visible select-none">
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1="45" y1="30" x2="655" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="45" y1="67" x2="655" y2="67" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="45" y1="105" x2="655" y2="105" stroke="#E2E8F0" strokeWidth="1.5" />

                {/* When no activity: gentle centered notice */}
                {!hasChartActivity && (
                  <g>
                    <text
                      x="350"
                      y="58"
                      textAnchor="middle"
                      className="text-xs font-semibold fill-slate-500"
                    >
                      {tr("No tasks completed in this time range")}
                    </text>
                    <text
                      x="350"
                      y="78"
                      textAnchor="middle"
                      className="text-[11px] font-normal fill-slate-400"
                    >
                      {tr("Completed milestone tasks will plot across this timeline")}
                    </text>
                  </g>
                )}

                {/* Area under the line */}
                {hasChartActivity && areaPath && (
                  <path d={areaPath} fill="url(#chart-area-grad)" className="transition-all duration-500 ease-out" />
                )}

                {/* Line path */}
                {hasChartActivity && linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}

                {/* Markers & Value Indicators */}
                {chartPoints.map((p, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="10" className="fill-transparent group-hover:fill-blue-500/10 transition-colors" />

                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hasChartActivity && p.value > 0 ? 5 : 4}
                      className={cn(
                        "transition-all",
                        hasChartActivity && p.value > 0
                          ? "fill-white stroke-blue-600 stroke-2"
                          : "fill-white stroke-slate-300 stroke-2"
                      )}
                    />
                    {hasChartActivity && p.value > 0 && (
                      <circle cx={p.x} cy={p.y} r="2.5" className="fill-blue-600" />
                    )}

                    {hasChartActivity && (
                      <text
                        x={p.x}
                        y={p.y - 9}
                        textAnchor="middle"
                        className={cn(
                          "text-[10px] font-bold transition-opacity",
                          p.value > 0 ? "fill-blue-600" : "fill-slate-400"
                        )}
                      >
                        {tr(p.value)}
                      </text>
                    )}

                    <text
                      x={p.x}
                      y="126"
                      textAnchor="middle"
                      className="text-[10px] font-semibold fill-slate-500"
                    >
                      {tr(p.label)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* ── Breakdown by Milestone ── */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-none space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{tr("Breakdown by Milestone")}</h3>
                <p className="text-xs text-slate-400 font-medium">{tr("Completed task deliverables grouped by milestone")}</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
              {tr(totalFiltered)} {totalFiltered === 1 ? tr("Task") : tr("Tasks")}
            </span>
          </div>

          {Object.keys(groupedTasks).length === 0 ? (
            <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-700">{tr("No Tasks Completed in this Timeframe")}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {tr("Tasks marked complete during this period will appear grouped here.")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTasks).map(([milestoneName, tasks], index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 tracking-wide">
                      {tr(milestoneName)}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {tasks.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tasks.map((task, tIndex) => (
                      <div
                        key={tIndex}
                        onClick={() => setSelectedTask(task)}
                        className="bg-white border border-slate-200/80 hover:border-blue-400/80 rounded-xl p-3 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {tr(task.title)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {safeFormatDate(task.completedAtDate)}
                              </span>
                              <span>•</span>
                              <span className="truncate">{getMemberName(task.assignedTo)}</span>
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-0.5 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quality & Site Health Grid: Issues & Snags ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Reported Issues */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-none flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{tr("Reported Issues")}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{tr("Logged site issues & blockers")}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                {rangeIssues.length} {rangeIssues.length === 1 ? tr("Issue") : tr("Issues")}
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-center">
              {rangeIssues.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">{tr("No Issues Reported")}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{tr("All clear for this time range.")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="pb-2">{tr("Issue")}</th>
                        <th className="pb-2">{tr("Priority")}</th>
                        <th className="pb-2">{tr("Status")}</th>
                        <th className="pb-2 text-end">{tr("Date")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rangeIssues.map((issue, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 pe-2">
                            <div className="font-semibold text-slate-900 truncate max-w-[180px]">{tr(issue.title)}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{issue.category || tr("General")}</div>
                          </td>
                          <td className="py-2.5 pe-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                              issue.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                              issue.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                              'bg-blue-50 text-blue-700 border-blue-100'
                            )}>
                              {tr(issue.priority)}
                            </span>
                          </td>
                          <td className="py-2.5 pe-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                              issue.status === 'Resolved' || issue.status === 'Closed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            )}>
                              {tr(issue.status)}
                            </span>
                          </td>
                          <td className="py-2.5 text-end text-slate-400 text-[11px] whitespace-nowrap">
                            {safeFormatDate(issue.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Reported Snags */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-none flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{tr("Reported Snags")}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{tr("Defects & punch list items")}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                {rangeSnags.length} {rangeSnags.length === 1 ? tr("Snag") : tr("Snags")}
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-center">
              {rangeSnags.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">{tr("No Snags Reported")}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{tr("No punch items recorded for this range.")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="pb-2">{tr("Snag Title")}</th>
                        <th className="pb-2">{tr("Priority")}</th>
                        <th className="pb-2">{tr("Status")}</th>
                        <th className="pb-2 text-end">{tr("Date")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rangeSnags.map((snag, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 pe-2">
                            <div className="font-semibold text-slate-900 truncate max-w-[180px]">{tr(snag.title)}</div>
                            {snag.description && <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{tr(snag.description)}</div>}
                          </td>
                          <td className="py-2.5 pe-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                              snag.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                              snag.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                              'bg-blue-50 text-blue-700 border-blue-100'
                            )}>
                              {tr(snag.priority)}
                            </span>
                          </td>
                          <td className="py-2.5 pe-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                              snag.status === 'Resolved' || snag.status === 'Closed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            )}>
                              {tr(snag.status)}
                            </span>
                          </td>
                          <td className="py-2.5 text-end text-slate-400 text-[11px] whitespace-nowrap">
                            {safeFormatDate(snag.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Activity Logs Section ── */}
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-none">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{tr("Activity Logs")}</h3>
                <p className="text-xs text-slate-400 font-medium">{tr("Audit trail of actions performed on this project")}</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
              {rangeLogs.length} {rangeLogs.length === 1 ? tr("Record") : tr("Records")}
            </span>
          </div>

          {rangeLogs.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">{tr("No Activity Logs Found")}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{tr("No logged actions recorded within this date range.")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px]">
                    <th className="px-4 py-3">{tr("User")}</th>
                    <th className="px-4 py-3">{tr("Role")}</th>
                    <th className="px-4 py-3">{tr("Action")}</th>
                    <th className="px-4 py-3">{tr("Details")}</th>
                    <th className="px-4 py-3 text-end">{tr("Date & Time")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {rangeLogs.map((log: any, idx: number) => {
                    const userName = log.userName || log.user?.name || 'System';
                    const initials = userName
                      .split(' ')
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'S';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {tr(initials)}
                            </div>
                            <span className="font-bold text-slate-900 truncate">{tr(userName)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-slate-500 font-medium">
                            {log.userRole || log.user?.role || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                            {tr(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-sm truncate" title={log.details}>
                          {tr(log.details)}
                        </td>
                        <td className="px-4 py-3 text-end text-slate-400 font-medium whitespace-nowrap">
                          {safeFormatDateTime(log.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-2xl shadow-none border border-slate-200 p-6 space-y-5 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-base font-bold text-gray-900">{tr("Task Details")}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="p-1.5 text-slate-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tr("Task Title")}</h5>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{tr(selectedTask.title)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tr("Completed By")}</h5>
                      <p className="text-xs font-medium text-slate-700 mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {getMemberName(selectedTask.assignedTo)}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tr("Completed On")}</h5>
                      <p className="text-xs font-medium text-slate-700 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {safeFormatDate(selectedTask.completedAtDate)}
                      </p>
                    </div>
                  </div>

                  {selectedTask.completionNote && (
                    <div className="bg-blue-50/50 border border-blue-100/60 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />{tr(" Completion Note")}
                      </p>
                      <p className="text-xs text-slate-700 font-medium mt-2 leading-relaxed whitespace-pre-wrap">
                        {tr(selectedTask.completionNote)}
                      </p>
                    </div>
                  )}

                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{tr("Proof of Work")}</h5>
                    {selectedTask.proofImage?.url ? (
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video relative group">
                        <img loading="lazy" decoding="async"
                          src={selectedTask.proofImage.url}
                          alt={tr("Proof of work")}
                          className="w-full h-full object-cover"
                        />
                        <a
                          href={selectedTask.proofImage.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5"
                        >
                          <ImageIcon className="w-4 h-4" />{tr(" View Full Image")}
                        </a>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-slate-400 text-center gap-1.5">
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                        <p className="text-xs font-medium">{tr("No proof image provided")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-slate-700 transition-colors"
                  >
                    {tr("Close")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SkeletonLoader>
  );
};

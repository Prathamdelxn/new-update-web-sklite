'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, CheckCircle2, Circle, Clock, MessageSquare,
  User, Image as ImageIcon, X, ChevronRight, Loader2, BarChart2,
  TrendingUp, Activity, Download, Mail, FileText, Wrench, AlertCircle, XOctagon
} from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthContext';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { hasProjectPermission } from '@/lib/permissions';

interface ReportsTabProps {
  projectId: string;
}

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
        toast.error('Failed to load reports data');
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

  const handleExportReport = () => {
    if (Object.keys(groupedTasks).length === 0) {
      toast.error('No report data available to export');
      return;
    }

    const headers = ['Milestone Name', 'Task Title', 'Completed By', 'Completed Date', 'Completion Note'];
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

    const csv = [headers, ...rows].map(r =>
      r.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${reportType} report exported successfully`);
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
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      
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
      let htmlContent = `
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
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
          </style>
        </head>
        <body>
          <div class="header">
            <p class="project-label">Project: ${project?.name || contextProject?.name || 'Sunrise Height'}</p>
            <h2 class="report-title">${reportType === 'Daily' ? 'Daily Project Report (Last 7 Days)' : 'Monthly Project Report (Last 6 Months)'}</h2>
            <p class="gen-date">Generated on: ${safeFormatDate(new Date())}</p>
          </div>

          <h3>Completed Tasks</h3>
          ${recentTasks.length === 0 ? `
            <div class="empty">No tasks completed in this range.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Task Title</th>
                  <th>Completion Date</th>
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

          <h3>Reported Issues</h3>
          ${rangeIssues.length === 0 ? `
            <div class="empty">No issues reported in this range.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>Issue Title</th>
                  <th>Category</th>
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
                    <td>${issue.category || 'Other'}</td>
                    <td><span class="priority-${issue.priority.toLowerCase()}">${issue.priority}</span></td>
                    <td>${issue.status}</td>
                    <td>${safeFormatDate(issue.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <h3>Reported Snags</h3>
          ${rangeSnags.length === 0 ? `
            <div class="empty">No snags reported in this range.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>Snag Title</th>
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
                    <td><span class="priority-${snag.priority.toLowerCase()}">${snag.priority}</span></td>
                    <td>${snag.status}</td>
                    <td>${safeFormatDate(snag.createdAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}

          <h3>Activity Logs</h3>
          ${rangeLogs.length === 0 ? `
            <div class="empty">No activity logs in this range.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${rangeLogs.map((log: any) => `
                  <tr>
                    <td style="font-weight: bold;">${log.userName || log.user?.name || 'System'}</td>
                    <td style="text-transform: capitalize;">${log.userRole || log.user?.role || '-'}</td>
                    <td><span style="font-weight: bold; color: #2563eb;">${log.action}</span></td>
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

      const element = document.createElement('div');
      element.innerHTML = htmlContent;

      const opt = {
        margin:       0.3,
        filename:     `Project_Report_${project?.name || 'Details'}_${reportType}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('PDF report downloaded successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to download PDF report: ${err.message || err}`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleEmailReport = async () => {
    const targetEmail = user?.email;
    if (!targetEmail) {
      toast.error('Could not determine logged-in user email');
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
        startDate: startLimit.toISOString(),
        endDate: new Date().toISOString(),
        customTargetEmail: targetEmail,
      });
      toast.success(`Report PDF sent successfully to ${targetEmail}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send email report');
    } finally {
      setEmailing(false);
    }
  };

  // SVG Chart calculation parameters (shrunk for neat high-density UI)
  const chartPoints = useMemo(() => {
    const maxVal = Math.max(...chartData.map(c => c.value), 1);
    return chartData.map((item, index) => {
      // chart viewBox: 0 0 600 135
      // x: ranges from 40 to 560
      // y: ranges from 20 to 110 (height offset: 110 - valuePct * 90)
      const x = 40 + (index / (chartData.length - 1)) * 520;
      const y = 110 - (item.value / maxVal) * 90;
      return { x, y, value: item.value, label: item.label };
    });
  }, [chartData]);

  const linePath = useMemo(() => {
    return chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return `${linePath} L ${chartPoints[chartPoints.length - 1].x} 110 L ${chartPoints[0].x} 110 Z`;
  }, [chartPoints, linePath]);

  const canViewReports = hasProjectPermission(user, contextProject, 'reports:view');

  if (!canViewReports) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm mt-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <XOctagon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
          You do not have the required "Reports Management" permission to view this tab.
        </p>
      </div>
    );
  }

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-4">
        {/* Toggle Box */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl w-fit">
              <button
                onClick={() => setReportType('Daily')}
                className={cn(
                  'py-1.5 px-4 rounded-lg text-xs font-bold transition-all',
                  reportType === 'Daily'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-slate-500 hover:text-gray-700'
                )}
              >
                Daily
              </button>
              <button
                onClick={() => setReportType('Monthly')}
                className={cn(
                  'py-1.5 px-4 rounded-lg text-xs font-bold transition-all',
                  reportType === 'Monthly'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-slate-500 hover:text-gray-700'
                )}
              >
                Monthly
              </button>
            </div>

            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Export Report to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-700/10 rounded-xl text-xs font-bold text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download PDF Report"
            >
              {downloadingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>{downloadingPDF ? 'Downloading...' : 'Download PDF'}</span>
            </button> */}

            <button
              onClick={handleEmailReport}
              disabled={emailing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-700/10 rounded-xl text-xs font-bold text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Email PDF Report"
            >
              {emailing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              <span>{emailing ? 'Emailing...' : 'Email PDF'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              {reportType === 'Daily' ? 'Last 7 Days Activity' : 'Last 6 Months Activity'}
            </span>
          </div>
        </div>

        {/* Metric Header Card */}
        <GlassCard className="p-3.5 border-gray-200 flex justify-between items-center gap-4" gradient>
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Tasks</h4>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-gray-900 leading-none">{totalFiltered}</span>
              <span className="text-[11px] font-semibold text-slate-500">
                tasks in {reportType === 'Daily' ? 'last 7 days' : 'last 6 months'}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-blue-50/80 border border-blue-100/50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
        </GlassCard>

        {/* Custom SVG Line Chart */}
        <GlassCard className="p-4 border-gray-200 overflow-hidden" gradient>
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="min-w-[500px]">
              <svg viewBox="0 0 600 135" className="w-full h-auto overflow-visible select-none">
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1="40" y1="20" x2="560" y2="20" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="65" x2="560" y2="65" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="110" x2="560" y2="110" stroke="#E2E8F0" strokeWidth="1.5" />

                {/* Area under the line */}
                {areaPath && (
                  <path d={areaPath} fill="url(#chart-area-grad)" className="transition-all duration-500 ease-out" />
                )}

                {/* Line path */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500 ease-out"
                  />
                )}

                {/* Markers & Value Indicators */}
                {chartPoints.map((p, i) => (
                  <g key={i} className="group cursor-pointer">
                    {/* Glow ring */}
                    <circle cx={p.x} cy={p.y} r="8" className="fill-transparent group-hover:fill-blue-500/10 transition-colors" />
                    {/* Outer border dot */}
                    <circle cx={p.x} cy={p.y} r="5" className="fill-white stroke-blue-500 stroke-2" />
                    {/* Inner core dot */}
                    <circle cx={p.x} cy={p.y} r="2.5" className="fill-blue-500" />

                    {/* Value text above dot */}
                    <text
                      x={p.x}
                      y={p.y - 9}
                      textAnchor="middle"
                      className="text-[9px] font-black fill-blue-600 transition-opacity"
                    >
                      {p.value}
                    </text>

                    {/* Label at bottom */}
                    <text
                      x={p.x}
                      y="125"
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-slate-400"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </GlassCard>

        {/* Milestone Breakdown List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Breakdown by Milestone</h3>

          {Object.keys(groupedTasks).length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-slate-400 font-medium text-xs">No tasks completed in this time range.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTasks).map(([milestoneName, tasks], index) => (
                <div key={index} className="space-y-2">
                  <h4 className="text-[11px] font-extrabold text-slate-800 tracking-wide pl-1">
                    {milestoneName}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tasks.map((task, tIndex) => (
                      <GlassCard
                        key={tIndex}
                        className="p-2.5 border-gray-200 hover:border-blue-500/30 transition-colors flex items-center justify-between cursor-pointer group"
                        onClick={() => setSelectedTask(task)}
                        gradient
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {task.title}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                              <Calendar className="w-2.5 h-2.5" />
                              {safeFormatDate(task.completedAtDate)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-0.5" />
                      </GlassCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reported Issues Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Reported Issues</h3>
          {rangeIssues.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-slate-400 font-medium text-xs">No issues reported in this range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="p-3">Issue Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reported Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                  {rangeIssues.map((issue, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{issue.title}</div>
                        {issue.description && <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{issue.description}</div>}
                      </td>
                      <td className="p-3 text-slate-500">{issue.category || 'Other'}</td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-bold border',
                          issue.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                          issue.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        )}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-bold border',
                          issue.status === 'Resolved' || issue.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        )}>
                          {issue.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {safeFormatDate(issue.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reported Snags Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Reported Snags</h3>
          {rangeSnags.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-slate-400 font-medium text-xs">No snags reported in this range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="p-3">Snag Title</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reported Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                  {rangeSnags.map((snag, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{snag.title}</div>
                        {snag.description && <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{snag.description}</div>}
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-bold border',
                          snag.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                          snag.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        )}>
                          {snag.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-bold border',
                          snag.status === 'Resolved' || snag.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        )}>
                          {snag.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {safeFormatDate(snag.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Logs Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Activity Logs</h3>
          {rangeLogs.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-slate-400 font-medium text-xs">No activity logs in this range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-slate-700">
                  {rangeLogs.map((log: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{log.userName || log.user?.name || 'System'}</div>
                      </td>
                      <td className="p-3 text-slate-500 capitalize">{log.userRole || log.user?.role || '-'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 max-w-[250px] truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="p-3 text-slate-400">
                        {safeFormatDate(log.timestamp)}
                      </td>
                    </tr>
                  ))}
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
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-5 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-base font-bold text-gray-900">Task Details</p>
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
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Task Title</h5>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedTask.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completed By</h5>
                      <p className="text-xs font-medium text-slate-700 mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {getMemberName(selectedTask.assignedTo)}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completed On</h5>
                      <p className="text-xs font-medium text-slate-700 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {safeFormatDate(selectedTask.completedAtDate)}
                      </p>
                    </div>
                  </div>

                  {selectedTask.completionNote && (
                    <div className="bg-blue-50/50 border border-blue-100/60 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Completion Note
                      </p>
                      <p className="text-xs text-slate-700 font-medium mt-2 leading-relaxed whitespace-pre-wrap">
                        {selectedTask.completionNote}
                      </p>
                    </div>
                  )}

                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Proof of Work</h5>
                    {selectedTask.proofImage?.url ? (
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video relative group">
                        <img
                          src={selectedTask.proofImage.url}
                          alt="Proof of work"
                          className="w-full h-full object-cover"
                        />
                        <a
                          href={selectedTask.proofImage.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5"
                        >
                          <ImageIcon className="w-4 h-4" /> View Full Image
                        </a>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-slate-400 text-center gap-1.5">
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                        <p className="text-xs font-medium">No proof image provided</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-slate-700 transition-colors"
                  >
                    Close
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

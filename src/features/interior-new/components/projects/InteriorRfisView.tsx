'use client';
import { tr } from '@/i18n';
import { useDeepLinkParams } from '@/features/interior-new/hooks/useDeepLinkParams';

// RFIs — ask a specific person, or (if you're not sure who) let the project manager route it.

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, X, Loader2, Calendar, Send, CheckCircle, Trash2, UserCheck, HelpCircle, ArrowRightLeft, User,
  Route, PenTool, Zap, HardHat, Package, Calculator, UserRound, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';
import { memberRoleLabel } from '@/features/interior-new/lib/memberRoleLabel';

interface InteriorRfisViewProps {
  projectId: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  projectRole: string;
}

/** What the question is about → which project roles usually answer it. */
const TOPICS: Array<{ value: string; label: string; roles: string[]; icon: React.ElementType }> = [
  { value: 'design', label: 'Design & drawings', roles: ['designer'], icon: PenTool },
  { value: 'mep', label: 'MEP & services', roles: ['site_engineer', 'project_manager'], icon: Zap },
  { value: 'site', label: 'Site & structure', roles: ['site_engineer'], icon: HardHat },
  { value: 'materials', label: 'Materials & specifications', roles: ['designer', 'quantity_surveyor'], icon: Package },
  { value: 'cost', label: 'Cost & quantities', roles: ['quantity_surveyor'], icon: Calculator },
  { value: 'client', label: 'Client decision', roles: ['client_representative'], icon: UserRound },
  { value: 'other', label: 'Other', roles: ['project_manager'], icon: MoreHorizontal },
];

const ASK_MODES = [
  { mode: 'person' as const, icon: User, title: 'I know who to ask', sub: 'Send it straight to them' },
  { mode: 'unsure' as const, icon: HelpCircle, title: 'Not sure who to ask', sub: 'The project manager will route it' },
];

const FIELD =
  'w-full h-9 px-3 text-[13px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary)/0.5)]';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;
const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-600',
};

const DUE_PICKS = [
  { days: 3, label: 'In 3 days' },
  { days: 7, label: 'In 1 week' },
  { days: 14, label: 'In 2 weeks' },
];

const isoInDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[18px] h-[18px] rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] text-[10px] font-bold flex items-center justify-center shrink-0">
        {n}
      </span>
      <h4 className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{title}</h4>
      {hint && <span className="text-[11px] text-[hsl(var(--muted-foreground))]">· {hint}</span>}
    </div>
  );
}

/** Styled native dropdown (same size/look as the text fields). */
function SelectField({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(FIELD, 'appearance-none pe-9 cursor-pointer [&_option]:text-[hsl(var(--foreground))] [&_optgroup]:text-[hsl(var(--muted-foreground))]', !value && 'text-slate-400')}>
        {children}
      </select>
      <ChevronDown className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--muted-foreground))]" />
    </div>
  );
}

function Avatar({ name, on, small }: { name: string; on?: boolean; small?: boolean }) {
  const initials = (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className={cn(
        'rounded-full flex items-center justify-center font-bold shrink-0',
        small ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]',
        on ? 'bg-white/25 text-white' : 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]'
      )}
    >
      {initials}
    </span>
  );
}
const topicLabel = (v?: string) => TOPICS.find((t) => t.value === v)?.label;

const idOf = (v: any): string => (v && typeof v === 'object' ? String(v._id ?? v.id ?? '') : v ? String(v) : '');
const personName = (u: any) =>
  !u ? '' : typeof u === 'object' ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '' : '';

function readMyId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return idOf(JSON.parse(localStorage.getItem('interiorUser') || 'null'));
  } catch {
    return '';
  }
}

type Filter = 'all' | 'mine' | 'raised' | 'unassigned';

export default function InteriorRfisView({ projectId }: InteriorRfisViewProps) {
  const toast = useToast();
  const { can: canDo } = useProjectPermissions(projectId);
  const { confirm } = useConfirm();
  const [me] = useState(readMyId);

  const [rfis, setRfis] = useState<any[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const [selectedRfi, setSelectedRfi] = useState<any>(null);
  // Opened from "What needs doing" (?rfi=<id>): open that RFI thread
  useDeepLinkParams(['rfi'], !loading && rfis.length > 0, ({ rfi }) => {
    const match = rfis.find((r: any) => String(r._id) === rfi);
    if (match) setSelectedRfi(match);
  });
  const [responseText, setResponseText] = useState('');

  // create form
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [askMode, setAskMode] = useState<'person' | 'unsure'>('person');
  const [assignee, setAssignee] = useState('');
  const [topic, setTopic] = useState('');

  // assign / reassign (in the thread drawer)
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const fetchRFIs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await interiorProjectService.getRfis(projectId);
      if (res.success && res.data) {
        setRfis(res.data);
        // keep an open drawer in sync with the fresh record
        setSelectedRfi((cur: any) => (cur ? res.data.find((r: any) => r._id === cur._id) || null : cur));
      }
    } catch (err) {
      console.error('Failed to load RFIs', err);
      toast.error(tr("Failed to fetch RFIs registry"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    fetchRFIs();
    interiorProjectService
      .getProjectMembers(projectId)
      .then((res: any) => {
        const raw = res?.data || [];
        const list: Member[] = raw
          .map((m: any) => ({
            id: String(m.userId?._id || m.userId?.id || m.userId || ''),
            name: m.userId?.firstName ? `${m.userId.firstName} ${m.userId.lastName || ''}`.trim() : m.userId?.email || 'Member',
            email: m.userId?.email || '',
            role: memberRoleLabel(m),
            projectRole: m.projectRole || '',
          }))
          .filter((m: Member) => m.id);
        // de-duplicate (an admin can appear twice)
        setMembers(Array.from(new Map(list.map((m) => [m.id, m])).values()));
      })
      .catch(() => setMembers([]));
  }, [projectId]);

  const suggestions = useMemo(() => {
    const t = TOPICS.find((x) => x.value === topic);
    if (!t) return [];
    return members.filter((m) => t.roles.includes(m.projectRole) && m.id !== me);
  }, [topic, members, me]);

  const projectManagers = useMemo(() => members.filter((m) => m.projectRole === 'project_manager' && m.id !== me), [members, me]);

  const counts = useMemo(
    () => ({
      all: rfis.length,
      mine: rfis.filter((r) => r.status !== 'closed' && idOf(r.assignedTo) === me).length,
      raised: rfis.filter((r) => idOf(r.raisedBy) === me).length,
      unassigned: rfis.filter((r) => r.status !== 'closed' && !r.assignedTo).length,
    }),
    [rfis, me]
  );

  const visible = useMemo(() => {
    switch (filter) {
      case 'mine':
        return rfis.filter((r) => r.status !== 'closed' && idOf(r.assignedTo) === me);
      case 'raised':
        return rfis.filter((r) => idOf(r.raisedBy) === me);
      case 'unassigned':
        return rfis.filter((r) => r.status !== 'closed' && !r.assignedTo);
      default:
        return rfis;
    }
  }, [rfis, filter, me]);

  const resetForm = () => {
    setSubject('');
    setQuestion('');
    setPriority('medium');
    setDueDate('');
    setAskMode('person');
    setAssignee('');
    setTopic('');
  };

  const handleCreateRFI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !question) {
      toast.error(tr("Please fill in subject and question"));
      return;
    }
    if (askMode === 'person' && !assignee) {
      toast.error(tr("Choose who should answer, or pick \"Not sure who to ask\"."));
      return;
    }

    try {
      setSubmitting(true);
      const res = await interiorProjectService.createRfi(projectId, {
        subject,
        question,
        priority,
        topic: topic || undefined,
        assignedTo: askMode === 'person' ? assignee : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      if (res.success) {
        toast.success(tr(res.message || 'RFI raised successfully!'));
        setIsModalOpen(false);
        resetForm();
        fetchRFIs(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || tr("Failed to submit RFI"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTo || !selectedRfi) return;
    try {
      setSubmitting(true);
      const res = await interiorProjectService.updateRfi(projectId, {
        rfiId: selectedRfi._id,
        action: 'assign',
        assignedTo: assignTo,
        note: assignNote.trim() || undefined,
      });
      if (res.success) {
        toast.success(tr(res.message || 'RFI assigned'));
        setAssignOpen(false);
        setAssignTo('');
        setAssignNote('');
        fetchRFIs(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || tr("Failed to assign RFI"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim()) return;

    try {
      setSubmitting(true);
      const res = await interiorProjectService.updateRfi(projectId, {
        rfiId: selectedRfi._id,
        response: responseText,
      });
      if (res.success) {
        toast.success(tr("Response posted successfully!"));
        setResponseText('');
        fetchRFIs(true);
      }
    } catch (err) {
      console.error('Response submit failed', err);
      toast.error(tr("Failed to post response"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRFI = async (rfiId: string) => {
    try {
      const res = await interiorProjectService.updateRfi(projectId, { rfiId, status: 'closed' });
      if (res.success) {
        toast.success(tr("RFI closed and verified"));
        setSelectedRfi(null);
        fetchRFIs(true);
      }
    } catch (err) {
      console.error('Close RFI failed', err);
      toast.error(tr("Failed to close RFI"));
    }
  };

  const handleDeleteRFI = async (rfiId: string) => {
    const ok = await confirm({
      title: tr("Delete RFI"),
      message: tr("Are you sure you want to delete this RFI and its responses? This action cannot be undone."),
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await interiorProjectService.deleteRfi(projectId, rfiId);
      if (res.success) {
        toast.success(tr("RFI deleted"));
        setSelectedRfi(null);
        fetchRFIs(true);
      }
    } catch (err: any) {
      console.error('Delete RFI failed', err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || tr("Failed to delete RFI"));
    }
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'high':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    }
  };

  const canAssign = canDo('rfis', 'update');
  const selectCls = 'w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none';

  const memberOptions = (exclude?: string) =>
    members
      .filter((m) => m.id !== exclude)
      .map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
          {m.id === me ? ` (${tr('you')})` : ''} · {tr(m.role)}
        </option>
      ));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">{tr("Requests For Information (RFI)")}</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            {tr("Ask the right person, or let the project manager route it if you're not sure who can answer.")}
          </p>
        </div>
        {canDo('rfis', 'create') && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {tr("Raise RFI")}
          </Button>
        )}
      </div>

      {/* Queues */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['mine', 'Assigned to me'],
            ['raised', 'Raised by me'],
            ['unassigned', 'Needs an owner'],
          ] as Array<[Filter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5',
              filter === key
                ? 'bg-[hsl(var(--primary))] text-white border-transparent'
                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
            )}
          >
            {tr(label)}
            <span
              className={cn(
                'px-1.5 rounded-full text-[0.625rem]',
                filter === key
                  ? 'bg-white/25'
                  : key === 'unassigned' && counts.unassigned > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-[hsl(var(--muted))]'
              )}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          {rfis.length === 0
            ? tr("No RFIs raised yet. Click \"Raise RFI\" to submit a question.")
            : tr("Nothing in this list.")}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visible.map((rfi) => (
            <Card
              key={rfi._id}
              className="hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all cursor-pointer"
              onClick={() => setSelectedRfi(rfi)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-slate-500">
                    <MessageSquare className="w-3.5 h-3.5" /> {rfi.rfiNumber}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase border', getPriorityStyle(rfi.priority))}>
                      {tr(rfi.priority)}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[0.625rem] font-semibold uppercase border',
                        rfi.status === 'closed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : rfi.status === 'responded'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
                      )}
                    >
                      {tr(rfi.status)}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[hsl(var(--foreground))] line-clamp-1">{rfi.subject}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{rfi.question}</p>

                <div className="flex items-center justify-between gap-2 text-[0.6875rem] border-t border-[hsl(var(--border))] pt-3 mt-1.5">
                  {rfi.assignedTo ? (
                    <span className="flex items-center gap-1 min-w-0 text-[hsl(var(--foreground))]">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {tr("Asked:")} <b>{idOf(rfi.assignedTo) === me ? tr("You") : personName(rfi.assignedTo)}</b>
                      </span>
                    </span>
                  ) : rfi.status !== 'closed' ? (
                    <span className="flex items-center gap-1 text-amber-700 font-semibold">
                      <HelpCircle className="w-3.5 h-3.5" /> {tr("Needs an owner")}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] shrink-0">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    {new Date(rfi.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Raise RFI */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl flex flex-col border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden text-[13px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold leading-tight text-[hsl(var(--foreground))]">{tr("Raise RFI")}</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{tr("Ask a question about this project and get a recorded answer.")}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRFI} className="flex flex-col">
                <div className="px-6 py-5 space-y-5 max-h-[78vh] overflow-y-auto">
                  {/* 1. Question */}
                  <section className="space-y-2">
                    <StepTitle n={1} title={tr("Your question")} />
                    <input
                      required
                      className={FIELD}
                      placeholder={tr("Short title, e.g. Glass partition core alignment")}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                    <textarea
                      required
                      rows={3}
                      className={cn(FIELD, 'h-auto py-2 resize-none leading-relaxed')}
                      placeholder={tr("Describe what's unclear and what you need to know...")}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                  </section>

                  {/* 2. Topic + priority */}
                  <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <StepTitle n={2} title={tr("What is it about?")} hint={tr("Optional")} />
                      <SelectField value={topic} onChange={setTopic}>
                        <option value="">{tr("Choose a topic")}</option>
                        {TOPICS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {tr(t.label)}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                    <div className="space-y-2">
                      <StepTitle n={3} title={tr("Priority")} />
                      <div className="grid grid-cols-4 gap-1 p-1 h-9 rounded-lg bg-[hsl(var(--muted)/0.7)]">
                        {PRIORITY_OPTIONS.map((p) => {
                          const on = priority === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPriority(p)}
                              className={cn(
                                'flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                                on ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))] font-semibold' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[p])} />
                              {tr(p.charAt(0).toUpperCase() + p.slice(1))}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* 4. Who answers */}
                  <section className="space-y-2">
                    <StepTitle n={4} title={tr("Who should answer?")} />
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[hsl(var(--muted)/0.7)]">
                      {ASK_MODES.map(({ mode, icon: Icon, title }) => {
                        const on = askMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setAskMode(mode)}
                            className={cn(
                              'flex items-center justify-center gap-2 h-8 rounded-md text-xs font-medium transition-colors',
                              on ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))] font-semibold' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                            )}
                          >
                            <Icon className={cn('w-3.5 h-3.5', on && 'text-[hsl(var(--primary))]')} />
                            {tr(title)}
                          </button>
                        );
                      })}
                    </div>

                    {askMode === 'person' ? (
                      <>
                        <SelectField value={assignee} onChange={setAssignee}>
                          <option value="">{tr("Select a person")}</option>
                          {suggestions.length > 0 && (
                            <optgroup label={tr("Suggested for {{topic}}", { topic: tr(topicLabel(topic) || '') })}>
                              {suggestions.map((m) => (
                                <option key={`s-${m.id}`} value={m.id}>
                                  {m.name} — {tr(m.role)}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label={tr("Everyone on this project")}>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                                {m.id === me ? ` (${tr('you')})` : ''} — {tr(m.role)}
                              </option>
                            ))}
                          </optgroup>
                        </SelectField>
                        {suggestions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{tr("Suggested:")}</span>
                            {suggestions.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setAssignee(m.id)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 h-6 ps-0.5 pe-2 rounded-full border text-[11px] font-medium',
                                  assignee === m.id
                                    ? 'bg-[hsl(var(--primary))] text-white border-transparent'
                                    : 'border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.5)]'
                                )}
                              >
                                <Avatar name={m.name} small on={assignee === m.id} />
                                {m.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.35)]">
                        <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                          <Route className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                            {projectManagers.length > 0
                              ? tr("Goes to {{names}} to route", { names: projectManagers.map((m) => m.name).join(', ') })
                              : tr("This project has no project manager yet")}
                          </div>
                          <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))] mt-0.5">
                            {projectManagers.length > 0
                              ? tr("They will get an e-mail and assign it to the right person. Until then it shows under \"Needs an owner\".")
                              : tr("It will wait under \"Needs an owner\" until someone who can manage RFIs assigns it.")}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* 5. Deadline */}
                  <section className="space-y-2">
                    <StepTitle n={5} title={tr("Answer needed by")} hint={tr("Defaults to 7 days")} />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {DUE_PICKS.map(({ days, label }) => {
                        const v = isoInDays(days);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setDueDate(v)}
                            className={cn(
                              'h-8 px-3 rounded-lg border text-xs font-medium',
                              dueDate === v ? 'bg-[hsl(var(--primary))] text-white border-transparent' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                            )}
                          >
                            {tr(label)}
                          </button>
                        );
                      })}
                      <input type="date" className={cn(FIELD, 'h-8 w-[9.5rem] px-2 text-xs ms-auto')} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] min-w-0 truncate">
                    {askMode === 'person'
                      ? assignee
                        ? tr("Will be sent to {{name}}", { name: members.find((m) => m.id === assignee)?.name || '' })
                        : tr("Pick who should answer")
                      : tr("Will be routed by the project manager")}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                      {tr("Cancel")}
                    </Button>
                    <Button size="sm" type="submit" disabled={submitting || (askMode === 'person' && !assignee)}>
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" /> : <Send className="w-3.5 h-3.5 me-1.5" />}
                      {askMode === 'person' ? tr("Send RFI") : tr("Raise for routing")}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Thread drawer */}
      <AnimatePresence>
        {selectedRfi && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="w-full max-w-lg border-s border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl flex flex-col h-full"
            >
              <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-500 font-mono">{selectedRfi.rfiNumber}</h3>
                  <h2 className="text-base font-bold text-[hsl(var(--foreground))] line-clamp-1">{selectedRfi.subject}</h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedRfi(null);
                    setAssignOpen(false);
                  }}
                  className="p-1 rounded hover:bg-[hsl(var(--muted))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* People */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-[hsl(var(--border))]">
                    <div className="text-[0.625rem] uppercase font-bold text-[hsl(var(--muted-foreground))]">{tr("Raised by")}</div>
                    <div className="font-semibold mt-0.5">{idOf(selectedRfi.raisedBy) === me ? tr("You") : personName(selectedRfi.raisedBy) || '—'}</div>
                  </div>
                  <div
                    className={cn(
                      'p-3 rounded-lg border',
                      selectedRfi.assignedTo ? 'border-[hsl(var(--border))]' : 'border-amber-300 bg-amber-50 dark:bg-amber-500/10'
                    )}
                  >
                    <div className="text-[0.625rem] uppercase font-bold text-[hsl(var(--muted-foreground))]">{tr("Asked to answer")}</div>
                    <div className="font-semibold mt-0.5">
                      {selectedRfi.assignedTo
                        ? idOf(selectedRfi.assignedTo) === me
                          ? tr("You")
                          : personName(selectedRfi.assignedTo)
                        : tr("Not assigned yet")}
                    </div>
                  </div>
                </div>
                {selectedRfi.topic && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] -mt-3">
                    {tr("Topic:")} <b>{tr(topicLabel(selectedRfi.topic) || selectedRfi.topic)}</b>
                  </p>
                )}

                {/* Assign / reassign */}
                {selectedRfi.status !== 'closed' && canAssign && (
                  <div className="space-y-2">
                    {!assignOpen ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('gap-1.5', !selectedRfi.assignedTo && 'border-amber-400 text-amber-800')}
                        onClick={() => {
                          setAssignOpen(true);
                          setAssignTo('');
                          setAssignNote('');
                        }}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {selectedRfi.assignedTo ? tr("Reassign / forward") : tr("Assign to someone")}
                      </Button>
                    ) : (
                      <div className="p-3 rounded-lg border border-[hsl(var(--border))] space-y-2">
                        <select className={selectCls} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                          <option value="">{tr("Select a person")}</option>
                          {memberOptions(idOf(selectedRfi.assignedTo))}
                        </select>
                        <Input placeholder={tr("Note for them (optional)")} value={assignNote} onChange={(e) => setAssignNote(e.target.value)} />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)}>
                            {tr("Cancel")}
                          </Button>
                          <Button size="sm" disabled={!assignTo || submitting} onClick={handleAssign}>
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" />}
                            {tr("Assign")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Question")}</h4>
                  <div className="p-4 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-sm whitespace-pre-wrap">
                    {selectedRfi.question}
                  </div>
                </div>

                {selectedRfi.response && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      {tr("Answer")}
                      {selectedRfi.respondedBy && <span className="normal-case font-semibold"> · {personName(selectedRfi.respondedBy)}</span>}
                    </h4>
                    <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-sm whitespace-pre-wrap text-emerald-950 dark:text-emerald-200">
                      {selectedRfi.response}
                    </div>
                  </div>
                )}

                {/* Hand-off history */}
                {(selectedRfi.assignmentHistory || []).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("History")}</h4>
                    <ol className="space-y-1.5 text-xs">
                      {selectedRfi.assignmentHistory.map((h: any, i: number) => (
                        <li key={h._id || i} className="flex gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] mt-1.5 shrink-0" />
                          <span>
                            {i === 0
                              ? h.to
                                ? tr("{{by}} asked {{to}}", { by: personName(h.by), to: personName(h.to) })
                                : tr("{{by}} raised it for routing", { by: personName(h.by) })
                              : tr("{{by}} assigned it to {{to}}", { by: personName(h.by), to: personName(h.to) })}
                            {h.note && i > 0 && <span className="text-[hsl(var(--muted-foreground))]"> — “{h.note}”</span>}
                            <span className="text-[hsl(var(--muted-foreground))]">
                              {' '}
                              · {new Date(h.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {selectedRfi.status !== 'closed' && canDo('rfis', 'update') && (
                    <Button variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => handleCloseRFI(selectedRfi._id)}>
                      <CheckCircle className="w-4 h-4 me-1.5" />
                      {tr("Mark Resolved & Close")}
                    </Button>
                  )}
                  {canDo('rfis', 'delete') && (
                    <Button variant="outline" className="text-red-600 border-red-200 ms-auto" onClick={() => handleDeleteRFI(selectedRfi._id)}>
                      <Trash2 className="w-4 h-4 me-1.5" />
                      {tr("Delete RFI")}
                    </Button>
                  )}
                </div>
              </div>

              {selectedRfi.status !== 'closed' && canDo('rfis', 'update') && (
                <form onSubmit={handlePostResponse} className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex gap-2 shrink-0">
                  <Input
                    required
                    placeholder={tr("Type your answer...")}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

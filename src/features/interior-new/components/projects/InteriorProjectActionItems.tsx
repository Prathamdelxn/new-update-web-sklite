'use client';
import { tr } from '@/i18n';

// =============================================================================
// Interior project overview — "What needs doing"
// Turns the project's live records (tasks, snags, RFIs, risks, milestones,
// procurement, change requests, variation orders, DPRs) into one list of
// concrete next steps, sorted by urgency. Only sections the viewer can open
// are fetched, so no one sees (or 403s on) data outside their role.
// =============================================================================

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare, Bug, HelpCircle, ShieldAlert, Flag, ShoppingCart, GitPullRequest,
  FileDiff, ClipboardList, ChevronRight, RefreshCw, PartyPopper, ListTodo,
} from 'lucide-react';
import { Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useCanOpenSection } from '@/features/interior-new/lib/projectSectionAccess';
import { useCurrency } from '@/hooks/useCurrency';

type Kind = 'task' | 'snag' | 'rfi' | 'risk' | 'milestone' | 'po' | 'cr' | 'vo' | 'dpr';
type Bucket = 'overdue' | 'today' | 'soon' | 'waiting' | 'later';

interface ActionItem {
  id: string;
  kind: Kind;
  action: string; // verb phrase: what to do
  title: string; // which record
  meta?: string; // ref / stage / assignee
  due?: Date | null;
  mine: boolean; // assigned to the viewer
  section: string; // project sub-route to open
  step?: 'grn' | 'pay' | 'detail'; // procurement: which dialog to open
  priority?: string;
}

const KIND_META: Record<Kind, { label: string; icon: React.ElementType; color: string }> = {
  task: { label: 'Task', icon: CheckSquare, color: 'text-blue-500 bg-blue-50' },
  snag: { label: 'Snag', icon: Bug, color: 'text-amber-600 bg-amber-50' },
  rfi: { label: 'RFI', icon: HelpCircle, color: 'text-indigo-500 bg-indigo-50' },
  risk: { label: 'Risk', icon: ShieldAlert, color: 'text-red-500 bg-red-50' },
  milestone: { label: 'Milestone', icon: Flag, color: 'text-orange-500 bg-orange-50' },
  po: { label: 'Procurement', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50' },
  cr: { label: 'Change Request', icon: GitPullRequest, color: 'text-purple-500 bg-purple-50' },
  vo: { label: 'Variation Order', icon: FileDiff, color: 'text-fuchsia-500 bg-fuchsia-50' },
  dpr: { label: 'Site Report', icon: ClipboardList, color: 'text-slate-600 bg-slate-100' },
};

const BUCKETS: { key: Bucket; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Overdue', tone: 'text-red-600' },
  { key: 'today', label: 'Due today', tone: 'text-amber-600' },
  { key: 'soon', label: 'Due this week', tone: 'text-amber-600' },
  { key: 'waiting', label: 'Waiting on action', tone: 'text-blue-600' },
  { key: 'later', label: 'Coming up', tone: 'text-[hsl(var(--muted-foreground))]' },
];

const DAY = 24 * 60 * 60 * 1000;
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const CR_REVIEW: Record<string, string> = {
  submitted: 'Start review', design_review: 'Design review', pm_review: 'PM review',
  commercial_review: 'Commercial review', client_review: 'Client review',
};
const VO_REVIEW: Record<string, string> = {
  submitted: 'Start review', pm_review: 'PM review', commercial_review: 'Commercial review',
  management_approval: 'Management approval', client_approval: 'Client approval',
};
const CLOSED_PROJECT = ['completed', 'inactive', 'on-hold', 'on_hold', 'closed', 'cancelled'];

/** Exact record (and step) each item opens, e.g. procurement?po=<id>&do=grn */
const PARAM: Partial<Record<Kind, string>> = { task: 'task', snag: 'snag', rfi: 'rfi', risk: 'risk', milestone: 'milestone', po: 'po', cr: 'cr', vo: 'vo' };
function hrefFor(projectId: string, it: ActionItem): string {
  const base = `/interior-new/projects/${projectId}/${it.section}`;
  if (it.kind === 'dpr') return `${base}?do=new`;
  const key = PARAM[it.kind];
  const recordId = it.id.replace(/^[a-z]+-/, '').replace(/-(grn|pay)$/, '');
  if (!key || !/^[0-9a-f]{24}$/.test(recordId)) return base;
  const q = new URLSearchParams({ [key]: recordId });
  if (it.kind === 'po') q.set('do', it.step || 'detail');
  return `${base}?${q.toString()}`;
}

const idOf = (v: any): string => (v && typeof v === 'object' ? String(v._id ?? v.id ?? '') : v ? String(v) : '');
const listOf = (r: PromiseSettledResult<any> | undefined): any[] => {
  if (!r || r.status !== 'fulfilled') return [];
  const d = r.value?.data ?? r.value;
  return (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []).filter((x: any) => x && !x.isDeleted);
};
const toDate = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const clip = (s: any, n = 70) => {
  const t = String(s || '').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

function readMyId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const u = JSON.parse(localStorage.getItem('interiorUser') || 'null');
    return idOf(u);
  } catch {
    return '';
  }
}

function bucketOf(item: ActionItem, today: number): Bucket {
  if (!item.due) return 'waiting';
  const d = startOfDay(item.due);
  if (d < today) return 'overdue';
  if (d === today) return 'today';
  if (d - today <= 7 * DAY) return 'soon';
  return 'later';
}

function dueLabel(due: Date | null | undefined, today: number): string | null {
  if (!due) return null;
  const diff = Math.round((startOfDay(due) - today) / DAY);
  if (diff < 0) return `${-diff} day${diff === -1 ? '' : 's'} overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff <= 14) return `Due in ${diff} days`;
  return `Due ${due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

interface Props {
  projectId: string;
  projectStatus?: string;
}

export default function InteriorProjectActionItems({ projectId, projectStatus }: Props) {
  const router = useRouter();
  const canOpen = useCanOpenSection(projectId);
  const { formatCurrency } = useCurrency();
  const [scope, setScope] = useState<'mine' | 'all' | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Resolved once permissions load; null = still loading
  const allowed = useMemo(() => {
    const keys = ['tasks', 'snags', 'rfis', 'risks', 'milestones', 'procurement', 'payments', 'change-requests', 'variation-orders', 'dpr'];
    const out: Record<string, boolean> = {};
    for (const k of keys) {
      const v = canOpen(k);
      if (v === null) return null;
      out[k] = v;
    }
    return out;
  }, [canOpen]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['interior-project-actions', projectId, allowed],
    enabled: Boolean(projectId) && allowed !== null,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const a = allowed || {};
      const skip = Promise.resolve(null);
      const s = interiorProjectService;
      const [tasks, snags, rfis, risks, milestones, pos, payments, crs, vos, dprs] = await Promise.allSettled([
        a.tasks ? s.getTasks(projectId) : skip,
        a.snags ? s.getSnags(projectId) : skip,
        a.rfis ? s.getRfis(projectId) : skip,
        a.risks ? s.getRisks(projectId) : skip,
        a.milestones ? s.getMilestones(projectId) : skip,
        a.procurement ? s.getPurchaseOrders(projectId) : skip,
        a.payments ? s.getPayments(projectId) : skip,
        a['change-requests'] ? s.getChangeRequests(projectId) : skip,
        a['variation-orders'] ? s.getVariationOrders(projectId) : skip,
        a.dpr ? s.getDprs(projectId) : skip,
      ]);
      return {
        tasks: listOf(tasks), snags: listOf(snags), rfis: listOf(rfis), risks: listOf(risks),
        milestones: listOf(milestones), pos: listOf(pos),
        payments: payments.status === 'fulfilled' && payments.value ? listOf(payments) : null,
        crs: listOf(crs), vos: listOf(vos), dprs: listOf(dprs),
        dprAllowed: !!a.dpr,
      };
    },
  });

  const today = startOfDay(new Date());

  const items = useMemo<ActionItem[]>(() => {
    if (!data) return [];
    const me = readMyId();
    const isMe = (v: any) => !!me && idOf(v) === me;
    const out: ActionItem[] = [];
    const now = startOfDay(new Date());
    const soonCutoff = now + 7 * DAY;

    // Tasks — only what's actionable now: in review, overdue, or due within a week
    for (const t of data.tasks) {
      if (t.status === 'completed') continue;
      const due = toDate(t.endDate || t.dueDate);
      const inReview = t.status === 'in_review';
      if (!inReview && !(due && startOfDay(due) <= soonCutoff)) continue;
      const assignees: any[] = Array.isArray(t.assignees) ? t.assignees : [];
      const names = assignees
        .map((p) => (p && typeof p === 'object' ? [p.firstName, p.lastName].filter(Boolean).join(' ') : ''))
        .filter(Boolean);
      out.push({
        id: `task-${idOf(t)}`, kind: 'task', section: 'tasks', priority: t.priority,
        action: inReview ? 'Review and close' : t.status === 'in_progress' ? 'Finish' : 'Start',
        title: clip(t.name || t.title),
        meta: names.length ? names.join(', ') : 'Unassigned',
        due: inReview ? null : due,
        mine: assignees.some(isMe),
      });
    }

    // Snags
    for (const sg of data.snags) {
      const where = sg.location || sg.drawingTitle;
      if (['open', 'assigned', 'in_progress'].includes(sg.status)) {
        out.push({
          id: `snag-${idOf(sg)}`, kind: 'snag', section: 'snags', priority: sg.priority,
          action: sg.status === 'in_progress' ? 'Finish fixing snag' : 'Fix snag',
          title: clip(sg.description || sg.title || 'Snag'),
          meta: [where, sg.assignee ? null : 'Unassigned'].filter(Boolean).join(' · ') || undefined,
          due: toDate(sg.dueDate), mine: isMe(sg.assignee),
        });
      } else if (sg.status === 'resolved') {
        out.push({
          id: `snag-${idOf(sg)}`, kind: 'snag', section: 'snags', priority: sg.priority,
          action: 'Verify snag fix', title: clip(sg.description || 'Snag'), meta: where || undefined,
          due: null, mine: false,
        });
      }
    }

    // RFIs
    for (const r of data.rfis) {
      if (r.status === 'open') {
        out.push({
          id: `rfi-${idOf(r)}`, kind: 'rfi', section: 'rfis', priority: r.priority,
          action: 'Answer RFI', title: clip(r.subject || r.question), meta: r.rfiNumber,
          due: toDate(r.dueDate), mine: isMe(r.assignedTo),
        });
      } else if (r.status === 'responded') {
        out.push({
          id: `rfi-${idOf(r)}`, kind: 'rfi', section: 'rfis', priority: r.priority,
          action: 'Review answer and close RFI', title: clip(r.subject || r.question), meta: r.rfiNumber,
          due: null, mine: isMe(r.raisedBy),
        });
      }
    }

    // Risks — open and high-scoring
    for (const rk of data.risks) {
      if (rk.status !== 'open' || Number(rk.score || 0) < 6) continue;
      out.push({
        id: `risk-${idOf(rk)}`, kind: 'risk', section: 'risks',
        priority: Number(rk.score) >= 9 ? 'critical' : 'high',
        action: rk.mitigationPlan ? 'Act on mitigation plan' : 'Add a mitigation plan',
        title: clip(rk.description), meta: tr('Score {{score}}/9', { score: rk.score }),
        due: toDate(rk.dueDate), mine: isMe(rk.owner),
      });
    }

    // Milestones
    for (const m of data.milestones) {
      if (m.status === 'achieved') continue;
      const due = toDate(m.dueDate);
      if (m.status === 'delayed') {
        out.push({
          id: `ms-${idOf(m)}`, kind: 'milestone', section: 'milestones', priority: 'high',
          action: 'Recover delayed milestone', title: clip(m.name), due, mine: false,
        });
      } else if (due && startOfDay(due) <= soonCutoff) {
        out.push({
          id: `ms-${idOf(m)}`, kind: 'milestone', section: 'milestones',
          action: startOfDay(due) < now ? 'Mark achieved or delayed' : 'Get milestone done',
          title: clip(m.name), due, mine: false,
        });
      }
    }

    // Procurement pipeline — the next step for each PO
    for (const po of data.pos) {
      const ref = [po.poNumber, po.materialName].filter(Boolean).join(' · ');
      const vendor = po.vendorName || po.vendor?.name;
      const base = { kind: 'po' as Kind, section: 'procurement', mine: false, id: `po-${idOf(po)}` };
      const due = toDate(po.deliveryDate || po.expectedDeliveryDate);
      switch (po.status) {
        case 'requested':
          out.push({ ...base, action: 'Send RFQ for material request', title: ref, meta: vendor, due: null });
          break;
        case 'rfq':
          out.push({ ...base, action: 'Compare quotes and raise PO', title: ref, meta: vendor, due: null });
          break;
        case 'pending':
          out.push({ ...base, action: 'Approve purchase order', title: ref, meta: [vendor, po.amount ? formatCurrency(po.amount) : null].filter(Boolean).join(' · '), due: null });
          break;
        case 'approved':
        case 'ordered':
        case 'dispatched':
          if (due && startOfDay(due) <= soonCutoff) {
            out.push({ ...base, step: 'grn', action: 'Receive delivery and log GRN', title: ref, meta: vendor, due });
          }
          break;
        case 'partially_delivered':
        case 'delivered': {
          if (po.status === 'partially_delivered') {
            out.push({ ...base, id: `${base.id}-grn`, step: 'grn', action: 'Chase remaining delivery', title: ref, meta: vendor, due });
          }
          if (data.payments) {
            const paid = data.payments
              .filter((p: any) => p.type === 'outgoing' && p.poNo === po.poNumber)
              .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
            const balance = Math.max(0, (Number(po.amount) || 0) - paid);
            if (balance > 0) {
              out.push({ ...base, id: `${base.id}-pay`, step: 'pay', action: tr('Pay vendor {{amount}}', { amount: formatCurrency(balance) }), title: ref, meta: vendor, due: null });
            }
          }
          break;
        }
      }
    }

    // Change requests waiting in a review stage
    for (const cr of data.crs) {
      const stage = CR_REVIEW[cr.status];
      if (!stage) continue;
      out.push({
        id: `cr-${idOf(cr)}`, kind: 'cr', section: 'change-requests', priority: cr.priority,
        action: stage, title: clip(cr.description || cr.title), meta: cr.crNumber, due: null, mine: false,
      });
    }

    // Variation orders waiting for approval / execution
    for (const vo of data.vos) {
      const stage = vo.status === 'approved' ? 'Execute approved VO' : VO_REVIEW[vo.status];
      if (!stage) continue;
      out.push({
        id: `vo-${idOf(vo)}`, kind: 'vo', section: 'variation-orders',
        action: stage, title: clip(vo.description || vo.title), meta: vo.voNumber, due: null, mine: false,
      });
    }

    // Today's site report
    const active = !CLOSED_PROJECT.includes(String(projectStatus || '').toLowerCase());
    if (data.dprAllowed && active) {
      const latest = data.dprs
        .map((d: any) => toDate(d.date || d.reportDate || d.createdAt))
        .filter(Boolean)
        .sort((x: any, y: any) => y.getTime() - x.getTime())[0] as Date | undefined;
      if (!latest || startOfDay(latest) < now) {
        out.push({
          id: 'dpr-today', kind: 'dpr', section: 'dpr',
          action: "Submit today's site report (DPR)",
          title: latest ? tr('Last report: {{date}}', { date: latest.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) }) : 'No site reports yet',
          due: new Date(), mine: false,
        });
      }
    }

    return out;
  }, [data, projectStatus, formatCurrency]);

  const mineCount = items.filter((i) => i.mine).length;
  const activeScope = scope ?? (mineCount > 0 ? 'mine' : 'all');
  const visible = activeScope === 'mine' ? items.filter((i) => i.mine) : items;

  const grouped = useMemo(() => {
    const byBucket = new Map<Bucket, ActionItem[]>();
    for (const it of visible) {
      const b = bucketOf(it, today);
      if (!byBucket.has(b)) byBucket.set(b, []);
      byBucket.get(b)!.push(it);
    }
    for (const list of byBucket.values()) {
      list.sort((x, y) => {
        const dx = x.due ? x.due.getTime() : Infinity;
        const dy = y.due ? y.due.getTime() : Infinity;
        if (dx !== dy) return dx - dy;
        return (PRIORITY_RANK[x.priority || ''] ?? 4) - (PRIORITY_RANK[y.priority || ''] ?? 4);
      });
    }
    return BUCKETS.filter((b) => byBucket.has(b.key)).map((b) => ({ ...b, items: byBucket.get(b.key)! }));
  }, [visible, today]);

  const overdueCount = visible.filter((i) => bucketOf(i, today) === 'overdue').length;
  const LIMIT = 8;
  let shown = 0;

  const loadingState = allowed === null || (isLoading && !data);

  return (
    <Card className="border border-[hsl(var(--border))]">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-[hsl(var(--primary))]" />
              {tr("What needs doing")}
              {!loadingState && visible.length > 0 && (
                <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">{visible.length}</span>
              )}
              {!loadingState && overdueCount > 0 && (
                <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 whitespace-nowrap">{tr(overdueCount)}{tr(" overdue")}</span>
              )}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{tr("Next steps across this project, most urgent first")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-[hsl(var(--border))] p-0.5 text-xs">
              {(['mine', 'all'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setScope(k); setExpanded(false); }}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${activeScope === k ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                >
                  {k === 'mine' ? tr("Assigned to me ({{mineCount}})", { mineCount: mineCount }) : tr("All ({{itemsCount}})", { itemsCount: items.length })}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              title={tr("Refresh")}
              className="p-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingState ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-[hsl(var(--muted))]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
            <PartyPopper className="w-7 h-7 text-emerald-500" />
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {activeScope === 'mine' ? tr("Nothing assigned to you right now") : tr("All caught up")}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {activeScope === 'mine' && items.length > 0
                ? tr("There are {{itemsCount}} open items for the team. Switch to All to see them.", { itemsCount: items.length })
                : tr("No overdue work, pending approvals or open issues.")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => {
              if (!expanded && shown >= LIMIT) return null;
              const take = expanded ? group.items : group.items.slice(0, Math.max(0, LIMIT - shown));
              shown += take.length;
              return (
                <div key={group.key} className="space-y-1.5">
                  <p className={`text-[0.6875rem] font-bold uppercase tracking-wider ${group.tone}`}>
                    {tr(group.label)} <span className="font-semibold text-[hsl(var(--muted-foreground))]">· {group.items.length}</span>
                  </p>
                  {take.map((it) => {
                    const meta = KIND_META[it.kind];
                    const Icon = meta.icon;
                    const label = dueLabel(it.due, today);
                    const overdue = group.key === 'overdue';
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => router.push(hrefFor(projectId, it))}
                        className="w-full text-start flex items-center gap-3 p-2.5 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.4)] transition-colors group"
                      >
                        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs sm:text-[0.8125rem] font-semibold text-[hsl(var(--foreground))] truncate">
                            {tr(it.action)}
                            {it.title ? <span className="font-normal text-[hsl(var(--muted-foreground))]"> — {tr(it.title)}</span> : null}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] text-[hsl(var(--muted-foreground))] mt-0.5">
                            <span>{tr(meta.label)}</span>
                            {it.meta && <span className="truncate max-w-[13.75rem]">· {tr(it.meta)}</span>}
                            {it.mine && <span className="font-semibold text-[hsl(var(--primary))]">{tr("· You")}</span>}
                            {(it.priority === 'critical' || it.priority === 'high') && (
                              <span className={`font-semibold ${it.priority === 'critical' ? 'text-red-600' : 'text-orange-500'}`}>
                                · {it.priority === 'critical' ? tr("Critical") : tr("High")}
                              </span>
                            )}
                          </span>
                        </span>
                        {label && (
                          <span className={`shrink-0 text-[0.6875rem] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full ${overdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'} ${group.key === 'later' ? '!bg-[hsl(var(--muted))] !text-[hsl(var(--muted-foreground))]' : ''}`}>
                            {tr(label)}
                          </span>
                        )}
                        <ChevronRight className="shrink-0 w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {visible.length > LIMIT && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full text-xs font-semibold text-[hsl(var(--primary))] hover:underline py-1"
              >
                {expanded ? tr("Show less") : tr("Show all {{visibleCount}}", { visibleCount: visible.length })}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

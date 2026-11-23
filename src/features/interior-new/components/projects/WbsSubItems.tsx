'use client';

// Sub-items (task.subtasks) shown under an activity in the WBS hierarchy:
// tick them off, see who owns each one, and add new ones. Saves the list (and the
// activity's progress %) through the normal task update API.

import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Plus, Loader2, User } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { tr } from '@/i18n';
import { cn } from '@/lib/utils';
import { interiorProjectService } from '@/services/interiorProject.service';

interface Props {
  projectId: string;
  task: any;
  members: { id: string; name: string }[];
  canEdit: boolean;
  onUpdated: (task: any) => void;
}

const isDone = (s: any) => !!(s?.completed ?? s?.isCompleted);

export default function WbsSubItems({ projectId, task, members, canEdit, onUpdated }: Props) {
  const subtasks: any[] = Array.isArray(task.subtasks) ? task.subtasks : [];
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState<string | null>(null); // subtask id / 'new'
  const toast = useToast();

  const doneCount = subtasks.filter(isDone).length;
  const whoName = (s: any) => {
    const a = s?.assignedTo;
    if (!a) return null;
    if (typeof a === 'object') return `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.name || null;
    return members.find((m) => String(m.id) === String(a))?.name || null;
  };

  const save = async (list: any[], key: string) => {
    setSaving(key);
    const progress = list.length ? Math.round((list.filter(isDone).length / list.length) * 100) : task.progress || 0;
    // keep ids / assignees, send plain values
    const payload = list.map((s) => ({
      ...(s._id ? { _id: s._id } : {}),
      title: s.title,
      completed: isDone(s),
      ...(s.dueDate ? { dueDate: new Date(s.dueDate).toISOString() } : {}),
      ...(s.assignedTo ? { assignedTo: typeof s.assignedTo === 'object' ? s.assignedTo._id || s.assignedTo.id : s.assignedTo } : {}),
    }));
    try {
      const res = await interiorProjectService.updateTask(projectId, task._id || task.id, { subtasks: payload, progress });
      const updated = res?.success && res?.data ? { ...task, ...res.data, assignees: task.assignees } : { ...task, subtasks: list, progress };
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || tr('Failed to update activity'));
    } finally {
      setSaving(null);
    }
  };

  const toggle = (s: any, i: number) => {
    if (!canEdit || saving) return;
    const list = subtasks.map((x, j) => (j === i ? { ...x, completed: !isDone(x) } : x));
    save(list, String(s._id || i));
  };

  const addItem = () => {
    const t = title.trim();
    if (!t || saving) return;
    save([...subtasks, { title: t, completed: false }], 'new').then(() => setTitle(''));
  };

  if (!subtasks.length && !canEdit) return null;

  return (
    <div className="border-t border-slate-100 ps-6 pe-2.5 pb-2 pt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-slate-500 hover:text-slate-800"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {tr('Sub-items')}
        <span className="ms-1 px-1.5 rounded-full bg-slate-100 text-slate-600 tabular-nums">
          {doneCount}/{subtasks.length}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1">
          {subtasks.map((s, i) => {
            const done = isDone(s);
            const who = whoName(s);
            const key = String(s._id || i);
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  disabled={!canEdit || !!saving}
                  onClick={() => toggle(s, i)}
                  title={canEdit ? (done ? tr('Mark as not done') : tr('Mark as done')) : undefined}
                  className={cn('shrink-0', canEdit ? 'cursor-pointer' : 'cursor-default')}
                >
                  {saving === key ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 hover:text-emerald-500" />
                  )}
                </button>
                <span className={cn('flex-1 min-w-0 truncate', done ? 'line-through text-slate-400' : 'text-slate-700')}>{tr(s.title)}</span>
                {who && (
                  <span className="inline-flex items-center gap-1 shrink-0 text-[0.625rem] text-slate-500">
                    <User className="w-3 h-3" />
                    {tr(who)}
                  </span>
                )}
              </div>
            );
          })}

          {canEdit && (
            <div className="flex items-center gap-2 pt-1">
              <Plus className="w-4 h-4 text-slate-300 shrink-0" />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                placeholder={tr('Add sub-item…')}
                className="flex-1 min-w-0 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 border-b border-transparent focus:border-blue-300 outline-none py-0.5"
              />
              {title.trim() && (
                <button
                  type="button"
                  onClick={addItem}
                  disabled={saving === 'new'}
                  className="shrink-0 text-[0.6875rem] font-semibold text-blue-600 hover:text-blue-700"
                >
                  {saving === 'new' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : tr('Add')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

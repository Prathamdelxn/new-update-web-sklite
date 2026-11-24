'use client';
import { tr } from '@/i18n';

// Utility / MEP commissioning checks — fully per project.
// Systems are detected from the project's scope on first open (backend) and the team
// can add, rename, mark N/A or remove systems and their checkpoints.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, X, Plus, Sparkles, MoreVertical, Pencil, Ban, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';

interface InteriorUtilitiesViewProps {
  projectId: string;
}

/** Quick-add suggestions only; nothing is created unless the user picks it. */
const SUGGESTIONS = ['Electrical', 'Lighting', 'HVAC', 'Plumbing & Drainage', 'Fire Fighting & Alarm', 'ELV / Low Current', 'Gas', 'STP / Sewage'];

const systemName = (sys: any) =>
  sys.label || String(sys.system || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

const errMsg = (err: any, fallback: string) => err?.response?.data?.message || err?.response?.data?.error || fallback;

export default function InteriorUtilitiesView({ projectId }: InteriorUtilitiesViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { can: canDo } = useProjectPermissions(projectId);
  const canEdit = canDo('utilities', 'update');

  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // checkpoint result modal
  const [cpModal, setCpModal] = useState<{ sys: any; cp: any } | null>(null);
  const [cpName, setCpName] = useState('');
  const [cpStatus, setCpStatus] = useState('passed');
  const [cpReadings, setCpReadings] = useState('');

  // add / rename system modal
  const [sysModal, setSysModal] = useState<{ mode: 'add' | 'rename'; sys?: any } | null>(null);
  const [sysLabel, setSysLabel] = useState('');
  const [sysCheckpoints, setSysCheckpoints] = useState('');

  // inline "add checkpoint" per system
  const [newCp, setNewCp] = useState<Record<string, string>>({});

  const fetchUtilities = useCallback(async () => {
    try {
      const res = await interiorProjectService.getUtilities(projectId);
      if (res.success && res.data) setSystems(res.data);
    } catch (err) {
      console.error('Failed to load utilities', err);
      toast.error(tr("Failed to fetch Utilities checklists"));
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (projectId) fetchUtilities();
  }, [projectId, fetchUtilities]);

  const run = async (fn: () => Promise<any>, ok?: string, fail = 'Update failed') => {
    try {
      setBusy(true);
      const res = await fn();
      if (ok) toast.success(tr(ok));
      await fetchUtilities();
      return res;
    } catch (err) {
      console.error(err);
      toast.error(tr(errMsg(err, fail)));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const update = (data: any, ok?: string) => run(() => interiorProjectService.updateUtility(projectId, data), ok);

  // ── actions ──
  const openCheckpoint = (sys: any, cp: any) => {
    if (!canEdit || sys.notApplicable) return;
    setCpModal({ sys, cp });
    setCpName(cp.name);
    setCpStatus(cp.status === 'pending' ? 'passed' : cp.status);
    setCpReadings(cp.readings || '');
  };

  const saveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpModal) return;
    const { sys, cp } = cpModal;
    const newName = cpName.trim();
    if (newName && newName !== cp.name) {
      const r = await update({ systemId: sys._id, action: 'renameCheckpoint', checkpointName: cp.name, name: newName });
      if (!r) return;
    }
    const r = await update(
      { systemId: sys._id, checkpointName: newName || cp.name, status: cpStatus, readings: cpReadings },
      'Checkpoint updated'
    );
    if (r) setCpModal(null);
  };

  const removeCheckpoint = async () => {
    if (!cpModal) return;
    const ok = await confirm({
      title: tr("Remove checkpoint?"),
      message: tr("\"{{name}}\" will be removed from {{system}}.", { name: cpModal.cp.name, system: systemName(cpModal.sys) }),
      confirmText: tr("Remove"),
      type: 'danger',
    });
    if (!ok) return;
    const r = await update({ systemId: cpModal.sys._id, action: 'removeCheckpoint', checkpointName: cpModal.cp.name }, 'Checkpoint removed');
    if (r) setCpModal(null);
  };

  const addCheckpoint = async (sys: any) => {
    const name = (newCp[sys._id] || '').trim();
    if (!name) return;
    const r = await update({ systemId: sys._id, action: 'addCheckpoint', name });
    if (r) setNewCp((p) => ({ ...p, [sys._id]: '' }));
  };

  const openAddSystem = () => {
    setSysModal({ mode: 'add' });
    setSysLabel('');
    setSysCheckpoints('');
  };

  const saveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = sysLabel.trim();
    if (!label || !sysModal) return;
    let r;
    if (sysModal.mode === 'rename') {
      r = await update({ systemId: sysModal.sys._id, action: 'rename', label }, 'System renamed');
    } else {
      const checkpoints = sysCheckpoints.split('\n').map((s) => s.trim()).filter(Boolean);
      r = await run(() => interiorProjectService.addUtility(projectId, { label, checkpoints }), 'System added');
    }
    if (r) setSysModal(null);
  };

  const removeSystem = async (sys: any) => {
    setMenuFor(null);
    const ok = await confirm({
      title: tr("Remove system?"),
      message: tr("\"{{system}}\" and its checkpoints will be removed from this project.", { system: systemName(sys) }),
      confirmText: tr("Remove"),
      type: 'danger',
    });
    if (ok) await run(() => interiorProjectService.deleteUtility(projectId, sys._id), 'System removed');
  };

  const detect = async () => {
    const res = await run(() => interiorProjectService.detectUtilities(projectId));
    if (res) toast.success(tr(res.message || 'Scope scanned'));
  };

  // ── summary ──
  const applicable = systems.filter((s) => !s.notApplicable);
  const totalCps = applicable.reduce((n, s) => n + s.checkpoints.length, 0);
  const passedCps = applicable.reduce((n, s) => n + s.checkpoints.filter((c: any) => c.status === 'passed').length, 0);
  const failedCps = applicable.reduce((n, s) => n + s.checkpoints.filter((c: any) => c.status === 'failed').length, 0);
  const overall = totalCps ? Math.round((passedCps / totalCps) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6" onClick={() => menuFor && setMenuFor(null)}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">{tr("Systems Commissioning & Utilities")}</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            {tr("Systems are picked up from this project's scope. Add, rename, mark N/A or remove them to match the actual work.")}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={detect}>
              <Sparkles className="w-3.5 h-3.5" />
              {tr("Detect from scope")}
            </Button>
            <Button size="sm" className="gap-1.5" disabled={busy} onClick={openAddSystem}>
              <Plus className="w-3.5 h-3.5" />
              {tr("Add system")}
            </Button>
          </div>
        )}
      </div>

      {systems.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-xs">
          <span className="font-bold text-[hsl(var(--foreground))]">
            {tr("Overall")} <span className="text-[hsl(var(--primary))]">{overall}%</span>
          </span>
          <span>{tr("{{count}} systems", { count: applicable.length })}</span>
          <span className="text-emerald-700">{tr("{{count}} passed", { count: passedCps })}</span>
          {failedCps > 0 && <span className="text-red-700">{tr("{{count}} failed", { count: failedCps })}</span>}
          <span className="text-[hsl(var(--muted-foreground))]">{tr("{{count}} pending", { count: totalCps - passedCps - failedCps })}</span>
        </div>
      )}

      {systems.length === 0 ? (
        <div className="py-14 text-center border border-dashed border-[hsl(var(--border))] rounded-2xl space-y-3">
          <Zap className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{tr("No utility systems in this project's scope yet")}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
            {tr("Nothing in the BOQ, quotation or site survey mentions electrical, HVAC, plumbing or other services. Add the systems this job needs.")}
          </p>
          {canEdit && (
            <div className="flex justify-center gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={detect}>
                <Sparkles className="w-3.5 h-3.5" />
                {tr("Detect from scope")}
              </Button>
              <Button size="sm" className="gap-1.5" disabled={busy} onClick={openAddSystem}>
                <Plus className="w-3.5 h-3.5" />
                {tr("Add system")}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {systems.map((sys) => {
            const total = sys.checkpoints.length;
            const passed = sys.checkpoints.filter((c: any) => c.status === 'passed').length;
            const progress = total ? Math.round((passed / total) * 100) : 0;
            return (
              <Card
                key={sys._id}
                className={cn('transition-all', sys.notApplicable ? 'opacity-60' : 'hover:shadow-md hover:border-[hsl(var(--primary)/0.3)]')}
              >
                <CardHeader className="p-4 border-b border-[hsl(var(--border))] flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-bold truncate">{tr(systemName(sys))}</CardTitle>
                      <p className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                        {sys.notApplicable
                          ? tr("Not applicable to this project")
                          : `${tr("{{passed}}/{{total}} passed", { passed, total })} · ${sys.source === 'auto' ? tr("From project scope") : tr("Added by team")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!sys.notApplicable && <span className="text-xs font-bold text-[hsl(var(--primary))]">{progress}%</span>}
                    {canEdit && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFor(menuFor === sys._id ? null : sys._id);
                          }}
                          className="p-1 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                          aria-label={tr("System options")}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuFor === sys._id && (
                          <div
                            className="absolute end-0 top-7 z-20 w-48 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg py-1 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[hsl(var(--muted))]"
                              onClick={() => {
                                setMenuFor(null);
                                setSysModal({ mode: 'rename', sys });
                                setSysLabel(systemName(sys));
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" /> {tr("Rename")}
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[hsl(var(--muted))]"
                              onClick={() => {
                                setMenuFor(null);
                                update({ systemId: sys._id, action: 'setNotApplicable', notApplicable: !sys.notApplicable });
                              }}
                            >
                              {sys.notApplicable ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              {sys.notApplicable ? tr("Mark applicable") : tr("Mark not applicable")}
                            </button>
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600"
                              onClick={() => removeSystem(sys)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {tr("Remove system")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                {!sys.notApplicable && (
                  <CardContent className="p-4 space-y-2.5">
                    <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                      <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    {sys.checkpoints.length === 0 && (
                      <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] py-1">{tr("No checkpoints yet. Add the tests this system needs.")}</p>
                    )}

                    {sys.checkpoints.map((cp: any) => (
                      <button
                        type="button"
                        key={cp.name}
                        onClick={() => openCheckpoint(sys, cp)}
                        disabled={!canEdit}
                        className="w-full text-start flex items-center justify-between gap-2 p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.35)] transition-all disabled:cursor-default"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{tr(cp.name)}</p>
                          {cp.readings && <p className="text-[0.625rem] text-[hsl(var(--muted-foreground))] truncate">{tr("Readings: ")}{cp.readings}</p>}
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[0.5625rem] uppercase font-bold border shrink-0',
                            cp.status === 'passed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cp.status === 'failed'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          {tr(cp.status)}
                        </span>
                      </button>
                    ))}

                    {canEdit && (
                      <form
                        className="flex items-center gap-2 pt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          addCheckpoint(sys);
                        }}
                      >
                        <Input
                          className="h-8 text-xs"
                          placeholder={tr("Add a checkpoint, e.g. Earthing test")}
                          value={newCp[sys._id] || ''}
                          onChange={(e) => setNewCp((p) => ({ ...p, [sys._id]: e.target.value }))}
                        />
                        <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5" disabled={busy || !(newCp[sys._id] || '').trim()}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </form>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Checkpoint result modal */}
      <AnimatePresence>
        {cpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))] truncate">{tr("Record test result")}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{tr(systemName(cpModal.sys))}</p>
                </div>
                <button onClick={() => setCpModal(null)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={saveCheckpoint}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{tr("Checkpoint")}</label>
                    <Input value={cpName} onChange={(e) => setCpName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{tr("Result")}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['pending', 'passed', 'failed'] as const).map((st) => (
                        <button
                          type="button"
                          key={st}
                          onClick={() => setCpStatus(st)}
                          className={cn(
                            'py-2 rounded-lg border text-xs font-bold capitalize',
                            cpStatus === st
                              ? st === 'passed'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : st === 'failed'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-slate-700 text-white border-slate-700'
                              : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                          )}
                        >
                          {tr(st === 'pending' ? 'Pending' : st === 'passed' ? 'Passed' : 'Failed')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{tr("Logged Readings / Notes")}</label>
                    <Input placeholder={tr("e.g. Pressure 10.2 Bar for 2 hours")} value={cpReadings} onChange={(e) => setCpReadings(e.target.value)} />
                  </div>
                  <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {tr("System progress updates automatically from passed checkpoints.")}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" disabled={busy} onClick={removeCheckpoint}>
                    <Trash2 className="w-3.5 h-3.5" /> {tr("Remove")}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setCpModal(null)}>
                      {tr("Cancel")}
                    </Button>
                    <Button type="submit" disabled={busy}>
                      {busy && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                      {tr("Save Changes")}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / rename system modal */}
      <AnimatePresence>
        {sysModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                  {sysModal.mode === 'add' ? tr("Add utility system") : tr("Rename system")}
                </h3>
                <button onClick={() => setSysModal(null)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={saveSystem}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{tr("System name")}</label>
                    <Input autoFocus placeholder={tr("e.g. HVAC, Kitchen Gas Line, Pool Pumps")} value={sysLabel} onChange={(e) => setSysLabel(e.target.value)} />
                  </div>
                  {sysModal.mode === 'add' && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTIONS.filter((s) => !systems.some((x) => systemName(x).toLowerCase() === s.toLowerCase())).map((s) => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => setSysLabel(s)}
                            className={cn(
                              'px-2.5 py-1 rounded-full border text-[0.6875rem] font-semibold',
                              sysLabel === s ? 'bg-[hsl(var(--primary))] text-white border-transparent' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                            )}
                          >
                            {tr(s)}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">{tr("Checkpoints (one per line, optional)")}</label>
                        <textarea
                          rows={4}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                          placeholder={tr("Leave empty to use the standard checklist for known systems")}
                          value={sysCheckpoints}
                          onChange={(e) => setSysCheckpoints(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setSysModal(null)}>
                    {tr("Cancel")}
                  </Button>
                  <Button type="submit" disabled={busy || !sysLabel.trim()}>
                    {busy && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                    {sysModal.mode === 'add' ? tr("Add system") : tr("Save")}
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

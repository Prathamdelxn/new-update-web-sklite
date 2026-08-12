'use client';

// Port of interior-os-frontend's projects/[projectId]/ncrs/page.tsx.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus, X, Loader2, FileText, Edit, Trash2 } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';

interface InteriorNcrsViewProps {
  projectId: string;
}

export default function InteriorNcrsView({ projectId }: InteriorNcrsViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editNcrId, setEditNcrId] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [status, setStatus] = useState('open');

  const fetchNcrs = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getNcrs(projectId);
      if (res?.success && res?.data) {
        setNcrs(res.data);
      }
    } catch (err) {
      console.error('Failed to load NCRs', err);
      toast.error('Failed to fetch Non-Conformance logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchNcrs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSubmitNCR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      toast.error('Description is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ncrId: editNcrId || undefined,
        description,
        rootCause,
        correctiveAction,
        status,
      };

      let res;
      if (editNcrId) {
        res = await interiorProjectService.updateNcr(projectId, payload);
      } else {
        res = await interiorProjectService.createNcr(projectId, payload);
      }

      if (res?.success) {
        toast.success(editNcrId ? 'NCR updated successfully!' : 'Non-Conformance Report logged successfully!');
        closeModal();
        fetchNcrs();
      }
    } catch (err) {
      console.error('NCR submit fail', err);
      toast.error(editNcrId ? 'Failed to update NCR' : 'Failed to log NCR');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNCR = async (ncrId: string) => {
    const ok = await confirm({
      title: 'Delete NCR',
      message: 'Are you sure you want to delete this Non-Conformance Report? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    try {
      setLoading(true);
      const res = await interiorProjectService.deleteNcr(projectId, ncrId);
      if (res?.success) {
        toast.success('NCR deleted successfully!');
        fetchNcrs();
      }
    } catch (err) {
      console.error('Delete NCR fail', err);
      toast.error('Failed to delete NCR');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditNcrId(null);
    setDescription('');
    setRootCause('');
    setCorrectiveAction('');
    setStatus('open');
    setIsModalOpen(true);
  };

  const openEditModal = (ncr: any) => {
    setEditNcrId(ncr._id);
    setDescription(ncr.description || '');
    setRootCause(ncr.rootCause || '');
    setCorrectiveAction(ncr.correctiveAction || '');
    setStatus(ncr.status || 'open');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditNcrId(null);
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'investigation':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'corrective_action':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
      default:
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Non-Conformance Reports (NCR)</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Record quality deviations, audit materials testing failures, and trace corrective workflows.
          </p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-4 h-4 mr-2" />
          Log NCR
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : ncrs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No quality non-conformances logged for this project yet. Click &quot;Log NCR&quot; to register a quality deviation.
        </Card>
      ) : (
        <div className="space-y-4">
          {ncrs.map((ncr) => (
            <Card key={ncr._id} className="hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-500 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {ncr.ncrNumber}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border', getStatusBadge(ncr.status))}>
                    {String(ncr.status).replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => openEditModal(ncr)}
                      className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Edit NCR"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNCR(ncr._id)}
                      className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete NCR"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">{ncr.description}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-[hsl(var(--border))]">
                  {ncr.rootCause && (
                    <div className="space-y-1">
                      <p className="font-semibold text-[hsl(var(--foreground))]">Investigated Root Cause:</p>
                      <p className="text-[hsl(var(--muted-foreground))]">{ncr.rootCause}</p>
                    </div>
                  )}
                  {ncr.correctiveAction && (
                    <div className="space-y-1">
                      <p className="font-semibold text-emerald-600">Corrective Action Taken:</p>
                      <p className="text-[hsl(var(--muted-foreground))]">{ncr.correctiveAction}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                  <AlertTriangle className="w-4 h-4 text-[hsl(var(--primary))]" />
                  {editNcrId ? 'Edit Quality NCR' : 'Log Quality NCR'}
                </h3>
                <button onClick={closeModal} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitNCR}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Deviation Description</label>
                    <Input required placeholder="e.g. Concrete cube compression test failed target" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Root Cause Investigation</label>
                    <Input placeholder="e.g. Excess water added in transit batch mix" value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Corrective Action Plan</label>
                    <Input placeholder="e.g. Demolish grid core column and recast with test audit" value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Workflow Status</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="investigation">Under Investigation</option>
                      <option value="corrective_action">Corrective Action</option>
                      <option value="verification">Verification Check</option>
                      <option value="closed">Closed / Solved</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editNcrId ? 'Update NCR' : 'Log NCR'}
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

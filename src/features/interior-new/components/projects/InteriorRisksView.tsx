'use client';

// Port of interior-os-frontend's projects/[projectId]/risks/page.tsx.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus, X, Loader2, Grid, Edit, Trash2 } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';

interface InteriorRisksViewProps {
  projectId: string;
}

export default function InteriorRisksView({ projectId }: InteriorRisksViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editRiskId, setEditRiskId] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('site_execution');
  const [probability, setProbability] = useState('medium');
  const [impact, setImpact] = useState('medium');
  const [mitigationPlan, setMitigationPlan] = useState('');

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getRisks(projectId);
      if (res?.success && res?.data) {
        setRisks(res.data);
      }
    } catch (err) {
      console.error('Failed to load risks', err);
      toast.error('Failed to fetch Risk Register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchRisks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSubmitRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !probability || !impact) {
      toast.error('Please fill in description, probability, and impact');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        riskId: editRiskId || undefined,
        description,
        category,
        probability,
        impact,
        mitigationPlan,
      };

      let res;
      if (editRiskId) {
        res = await interiorProjectService.updateRisk(projectId, payload);
      } else {
        res = await interiorProjectService.createRisk(projectId, payload);
      }

      if (res?.success) {
        toast.success(editRiskId ? 'Risk updated successfully!' : 'Risk logged successfully!');
        closeModal();
        fetchRisks();
      }
    } catch (err) {
      console.error('Risk submit fail', err);
      toast.error(editRiskId ? 'Failed to update risk' : 'Failed to log risk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    const ok = await confirm({
      title: 'Delete Risk',
      message: 'Are you sure you want to delete this risk? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    try {
      setLoading(true);
      const res = await interiorProjectService.deleteRisk(projectId, riskId);
      if (res?.success) {
        toast.success('Risk deleted successfully!');
        fetchRisks();
      }
    } catch (err) {
      console.error('Delete risk fail', err);
      toast.error('Failed to delete risk');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditRiskId(null);
    setDescription('');
    setCategory('site_execution');
    setProbability('medium');
    setImpact('medium');
    setMitigationPlan('');
    setIsModalOpen(true);
  };

  const openEditModal = (risk: any) => {
    setEditRiskId(risk._id);
    setDescription(risk.description || '');
    setCategory(risk.category || 'site_execution');
    setProbability(risk.probability || 'medium');
    setImpact(risk.impact || 'medium');
    setMitigationPlan(risk.mitigationPlan || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditRiskId(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 6) return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
    if (score >= 3) return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
  };

  const getMatrixCount = (p: string, imp: string) => {
    return risks.filter((r) => r.probability === p && r.impact === imp).length;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Risk Register</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Log execution, procurement, design, and vendor threats with probability-impact heatmap mitigation plans.
          </p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-4 h-4 mr-2" />
          Log Risk
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Grid className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <CardTitle className="text-base font-semibold">Severity Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-1 text-center font-bold text-xs select-none">
              <div className="h-10 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))]">P / I</div>
              <div className="h-10 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Low</div>
              <div className="h-10 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Medium</div>
              <div className="h-10 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))] uppercase">High</div>

              <div className="h-12 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))] uppercase">High</div>
              <div className="h-12 bg-amber-500/20 text-amber-700 flex items-center justify-center rounded">{getMatrixCount('high', 'low')}</div>
              <div className="h-12 bg-red-400/30 text-red-600 flex items-center justify-center rounded">{getMatrixCount('high', 'medium')}</div>
              <div className="h-12 bg-red-600/30 text-red-700 flex items-center justify-center rounded font-extrabold">{getMatrixCount('high', 'high')}</div>

              <div className="h-12 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Medium</div>
              <div className="h-12 bg-green-500/10 text-green-600 flex items-center justify-center rounded">{getMatrixCount('medium', 'low')}</div>
              <div className="h-12 bg-amber-500/20 text-amber-700 flex items-center justify-center rounded">{getMatrixCount('medium', 'medium')}</div>
              <div className="h-12 bg-red-400/30 text-red-600 flex items-center justify-center rounded">{getMatrixCount('medium', 'high')}</div>

              <div className="h-12 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Low</div>
              <div className="h-12 bg-green-500/10 text-green-600 flex items-center justify-center rounded">{getMatrixCount('low', 'low')}</div>
              <div className="h-12 bg-green-500/10 text-green-600 flex items-center justify-center rounded">{getMatrixCount('low', 'medium')}</div>
              <div className="h-12 bg-amber-500/20 text-amber-700 flex items-center justify-center rounded">{getMatrixCount('low', 'high')}</div>
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] text-center mt-3">
              Heatmap numbers count active logged project risks.
            </p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : risks.length === 0 ? (
            <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No active risks logged. Click &quot;Log Risk&quot; to register project threats.
            </Card>
          ) : (
            risks.map((risk) => (
              <Card key={risk._id} className="hover:border-[hsl(var(--primary)/0.3)] transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[10px]">
                      {String(risk.category).replace('_', ' ')}
                    </span>
                    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase', getScoreColor(risk.score))}>
                      Severity Score: {risk.score} ({risk.probability} × {risk.impact})
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => openEditModal(risk)}
                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Risk"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRisk(risk._id)}
                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete Risk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">{risk.description}</h3>
                  {risk.mitigationPlan && (
                    <div className="p-2.5 rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] text-xs space-y-1">
                      <p className="font-semibold text-[hsl(var(--foreground))]">Mitigation Strategy:</p>
                      <p className="text-[hsl(var(--muted-foreground))]">{risk.mitigationPlan}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

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
                  {editRiskId ? 'Edit Project Risk' : 'Log Project Risk'}
                </h3>
                <button onClick={closeModal} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitRisk}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Risk Description</label>
                    <Input required placeholder="e.g. Delayed HVAC supply might slip ceiling layout handover" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Threat Category</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="design">Design Mismatch</option>
                      <option value="procurement">Procurement & Sourcing</option>
                      <option value="site_execution">Site Execution Blocker</option>
                      <option value="client">Client Change Request</option>
                      <option value="vendor">Vendor Compliance</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Probability</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                        value={probability}
                        onChange={(e) => setProbability(e.target.value)}
                      >
                        <option value="low">Low (1)</option>
                        <option value="medium">Medium (2)</option>
                        <option value="high">High (3)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Impact Level</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                        value={impact}
                        onChange={(e) => setImpact(e.target.value)}
                      >
                        <option value="low">Low (1)</option>
                        <option value="medium">Medium (2)</option>
                        <option value="high">High (3)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Mitigation Strategy Plan</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      placeholder="Specify corrective actions checklist..."
                      value={mitigationPlan}
                      onChange={(e) => setMitigationPlan(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editRiskId ? 'Update Risk' : 'Log Risk'}
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

'use client';

// Port of interior-os-frontend's projects/[projectId]/snags/page.tsx.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Plus, X, Loader2, Calendar, MapPin } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface InteriorSnagsViewProps {
  projectId: string;
}

export default function InteriorSnagsView({ projectId }: InteriorSnagsViewProps) {
  const toast = useToast();
  const [snags, setSnags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const fetchSnags = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getSnags(projectId);
      if (res?.success && res?.data) {
        setSnags(res.data);
      }
    } catch (err) {
      console.error('Failed to load snags', err);
      toast.error('Failed to fetch Snag registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchSnags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !location) {
      toast.error('Please fill in description and location');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        description,
        location,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      };

      const res = await interiorProjectService.createSnag(projectId, payload);
      if (res?.success) {
        toast.success('Snag logged successfully!');
        setIsModalOpen(false);
        setDescription('');
        setLocation('');
        setPriority('medium');
        setDueDate('');
        fetchSnags();
      }
    } catch (err) {
      console.error('Snag submit fail', err);
      toast.error('Failed to log snag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (snagId: string, currentStatus: string) => {
    try {
      const nextStatus =
        currentStatus === 'resolved'
          ? 'closed'
          : currentStatus === 'open' || currentStatus === 'assigned' || currentStatus === 'in_progress'
          ? 'resolved'
          : 'open';
      const res = await interiorProjectService.updateSnag(projectId, { snagId, status: nextStatus });
      if (res?.success) {
        toast.success(`Snag status updated to: ${nextStatus}`);
        fetchSnags();
      }
    } catch (err) {
      console.error('Toggle status failed', err);
      toast.error('Failed to update status');
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'high':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'resolved':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Quality Snag Register</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Log site quality defects, assign vendor sub-contractors, and track closeout verification workflows.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Log Snag
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : snags.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No quality snags raised yet. Click &quot;Log Snag&quot; to record a punch list item.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snags.map((snag) => (
            <Card key={snag._id} className="hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <CardContent className="p-5 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> {snag.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border', getPriorityBadge(snag.priority))}>
                      {snag.priority}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border', getStatusBadge(snag.status))}>
                      {snag.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">{snag.description}</h3>

                <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-3 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Due: {snag.dueDate ? new Date(snag.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>

                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleToggleStatus(snag._id, snag.status)}>
                    {snag.status === 'open' || snag.status === 'assigned' || snag.status === 'in_progress'
                      ? 'Mark Resolved'
                      : snag.status === 'resolved'
                      ? 'Verify & Close'
                      : 'Reopen Snag'}
                  </Button>
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
                  <Bug className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Log Punch List Snag
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSnag}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Defect Description</label>
                    <Input required placeholder="e.g. Scratched premium wall paint near main pantry" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Defect Location / Area</label>
                    <Input required placeholder="e.g. Floor 4, Cafeteria Pantry Zone" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Priority</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Target Resolve Date</label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Log Snag
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

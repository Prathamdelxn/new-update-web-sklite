'use client';

// Port of interior-os-frontend's projects/[projectId]/rfis/page.tsx.
// TanStack/sonner/zustand replaced with local useState/useEffect + interiorProjectService.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, X, Loader2, Calendar, Send, CheckCircle } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface InteriorRfisViewProps {
  projectId: string;
}

export default function InteriorRfisView({ projectId }: InteriorRfisViewProps) {
  const toast = useToast();

  const [rfis, setRfis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedRfi, setSelectedRfi] = useState<any>(null);
  const [responseText, setResponseText] = useState('');

  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  const fetchRFIs = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getRfis(projectId);
      if (res.success && res.data) setRfis(res.data);
    } catch (err) {
      console.error('Failed to load RFIs', err);
      toast.error('Failed to fetch RFIs registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchRFIs();
  }, [projectId]);

  const handleCreateRFI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !question) {
      toast.error('Please fill in subject and question');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        subject,
        question,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      };

      const res = await interiorProjectService.createRfi(projectId, payload);
      if (res.success) {
        toast.success('RFI raised successfully!');
        setIsModalOpen(false);
        setSubject('');
        setQuestion('');
        setPriority('medium');
        setDueDate('');
        fetchRFIs();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit RFI');
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
        toast.success('Response posted successfully!');
        setResponseText('');
        setSelectedRfi(null);
        fetchRFIs();
      }
    } catch (err) {
      console.error('Response submit failed', err);
      toast.error('Failed to post response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRFI = async (rfiId: string) => {
    try {
      const res = await interiorProjectService.updateRfi(projectId, { rfiId, status: 'closed' });
      if (res.success) {
        toast.success('RFI closed and verified');
        setSelectedRfi(null);
        fetchRFIs();
      }
    } catch (err) {
      console.error('Close RFI failed', err);
      toast.error('Failed to close RFI');
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Requests For Information (RFI)</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Clarify design discrepancies, drawings mismatches, or site coordinates with consultants.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Raise RFI
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : rfis.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No RFIs raised yet. Click &quot;Raise RFI&quot; to submit a question.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rfis.map((rfi) => (
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
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border', getPriorityStyle(rfi.priority))}>
                      {rfi.priority}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border',
                        rfi.status === 'closed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : rfi.status === 'responded'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
                      )}
                    >
                      {rfi.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[hsl(var(--foreground))] line-clamp-1">{rfi.subject}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">{rfi.question}</p>

                <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-3 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" /> Due:{' '}
                    {new Date(rfi.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span>Click to view thread &rarr;</span>
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
                  <MessageSquare className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Raise design RFI
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRFI}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Subject Title</label>
                    <Input required placeholder="e.g. Glass partition core alignment" value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Clarification Question</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      placeholder="Specify drawing discrepancy details..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
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
                      <label className="text-xs font-semibold">Due Date</label>
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
                    Submit RFI
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRfi && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="w-full max-w-lg border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl flex flex-col h-full"
            >
              <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 font-mono">{selectedRfi.rfiNumber}</h3>
                  <h2 className="text-base font-bold text-[hsl(var(--foreground))] line-clamp-1">{selectedRfi.subject}</h2>
                </div>
                <button onClick={() => setSelectedRfi(null)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Question Description</h4>
                  <div className="p-4 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-sm whitespace-pre-wrap">
                    {selectedRfi.question}
                  </div>
                </div>

                {selectedRfi.status !== 'closed' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => handleCloseRFI(selectedRfi._id)}>
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Mark Resolved & Close
                    </Button>
                  </div>
                )}
              </div>

              {selectedRfi.status !== 'closed' && (
                <form onSubmit={handlePostResponse} className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex gap-2 shrink-0">
                  <Input
                    required
                    placeholder="Type consultant response or clarification note..."
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

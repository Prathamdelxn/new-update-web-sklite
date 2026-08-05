'use client';

// =============================================================================
// Sky-Lite Web — Interior-New MOM (Minutes of Meeting) View
// Port of interior-os-frontend's projects/[projectId]/mom/page.tsx, backed by
// interiorProjectService. The AI meeting-bot invite/sync feature
// (inviteMomBot/syncMomBot) is out of scope for this port and has been
// dropped — manual MOM logging is fully wired.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, X, Loader2, Users, CheckSquare, ClipboardList, Trash2 } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';

interface InteriorMomViewProps {
  projectId: string;
}

export default function InteriorMomView({ projectId }: InteriorMomViewProps) {
  const toast = useToast();

  const [moms, setMoms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [attendees, setAttendees] = useState('');
  const [agenda, setAgenda] = useState('');
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState<any[]>([{ description: '', status: 'open' }]);

  const fetchMoms = async () => {
    try {
      setIsLoading(true);
      const res = await interiorProjectService.getMoms(projectId);
      if (res.success && res.data) {
        setMoms(res.data);
      }
    } catch (err) {
      console.error('Failed to load MOMs', err);
      toast.error('Failed to fetch meeting minutes list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchMoms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const addActionRow = () => setActionItems([...actionItems, { description: '', status: 'open' }]);
  const removeActionRow = (idx: number) => setActionItems(actionItems.filter((_, i) => i !== idx));
  const updateActionRow = (idx: number, val: string) => {
    const updated = [...actionItems];
    updated[idx].description = val;
    setActionItems(updated);
  };

  const handleSubmitManualMOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !agenda || !notes) {
      toast.error('Please fill in title, agenda, and notes');
      return;
    }

    try {
      setIsCreating(true);
      await interiorProjectService.createMom(projectId, {
        title,
        date: date ? new Date(date) : undefined,
        attendees: attendees.split(',').map((s) => s.trim()).filter(Boolean),
        agenda,
        notes,
        actionItems,
      });
      toast.success('Meeting Minutes logged successfully!');
      setIsManualModalOpen(false);
      setTitle('');
      setDate('');
      setAttendees('');
      setAgenda('');
      setNotes('');
      setActionItems([{ description: '', status: 'open' }]);
      fetchMoms();
    } catch (err) {
      console.error(err);
      toast.error('Failed to log meeting minutes');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Minutes of Meeting (MOM)</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Log consultant discussions, client alignments, and assign site action items.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsManualModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Manual Log
          </Button>
          {/* AI Bot invite/sync (inviteMomBot/syncMomBot) intentionally skipped — meeting-bot integration is out of scope */}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : moms.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No meeting records logged yet. Use Manual Log to get started.
        </Card>
      ) : (
        <div className="space-y-6">
          {moms.map((mom) => (
            <Card key={mom._id} className="overflow-hidden hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <div className="p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-5 h-5 text-[hsl(var(--primary))]" />
                  <div>
                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))]">{mom.title}</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Held: {new Date(mom.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                {mom.attendees && mom.attendees.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] px-2.5 py-1 rounded-md border border-[hsl(var(--border))]">
                    <Users className="w-3.5 h-3.5" />
                    Attendees: <span className="font-semibold text-[hsl(var(--foreground))]">{mom.attendees.join(', ')}</span>
                  </div>
                )}
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Agenda & Notes */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Agenda</h4>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{mom.agenda}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Discussion Notes</h4>
                      <div className="text-sm mt-1 whitespace-pre-wrap max-w-none">{mom.notes}</div>
                    </div>
                  </div>

                  {/* Right Column: Action Items */}
                  <div>
                    <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Assigned Action Items</h4>
                    {!mom.actionItems || mom.actionItems.length === 0 ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">No action items logged.</p>
                    ) : (
                      <div className="space-y-2">
                        {mom.actionItems.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--muted)/0.1)]">
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs font-medium text-[hsl(var(--foreground))]">{item.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Manual MOM Logging Modal Dialog */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Log Minutes of Meeting (MOM)
                </h3>
                <button onClick={() => setIsManualModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitManualMOM}>
                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Meeting Title</label>
                      <Input required placeholder="e.g. Weekly MEP Coordination Align" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Meeting Date</label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Attendees (comma-separated)</label>
                    <Input placeholder="e.g. Sameer PM, Consultant A, Client Rep" value={attendees} onChange={(e) => setAttendees(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Meeting Agenda</label>
                    <textarea
                      required
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      placeholder="Specify meeting agenda topics..."
                      value={agenda}
                      onChange={(e) => setAgenda(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Discussion Notes</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      placeholder="Specify key discussion outcomes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* Action items checklist */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Action Items</h4>
                      <Button type="button" variant="outline" size="sm" onClick={addActionRow}>
                        Add Action
                      </Button>
                    </div>
                    {actionItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input required placeholder="Action Item description..." value={item.description} onChange={(e) => updateActionRow(idx, e.target.value)} />
                        <button
                          type="button"
                          onClick={() => removeActionRow(idx)}
                          disabled={actionItems.length === 1}
                          className="p-2 rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsManualModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save MOM
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

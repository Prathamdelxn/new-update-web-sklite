'use client';

// Port of interior-os-frontend's projects/[projectId]/dpr/page.tsx.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, CloudSun, Users, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';

interface InteriorDprViewProps {
  projectId: string;
}

export default function InteriorDprView({ projectId }: InteriorDprViewProps) {
  const toast = useToast();

  const [dprs, setDprs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dprDate, setDprDate] = useState('');
  const [weather, setWeather] = useState('Sunny');
  const [manpower, setManpower] = useState<any[]>([{ trade: 'Electrician', count: 2, contractor: 'Vendor A' }]);
  const [activities, setActivities] = useState<any[]>([
    { category: 'Wiring', description: 'Wall chasing and conduit installation', plannedProgress: 10, actualProgress: 10, remarks: '' },
  ]);

  const fetchDprs = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getDprs(projectId);
      if (res?.success && res?.data) setDprs(res.data);
    } catch (err) {
      console.error('Failed to load DPRs', err);
      toast.error('Failed to fetch DPR history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchDprs();
  }, [projectId]);

  const addManpowerRow = () => {
    setManpower([...manpower, { trade: 'Painter', count: 2, contractor: 'Vendor B' }]);
  };

  const removeManpowerRow = (idx: number) => {
    setManpower(manpower.filter((_, i) => i !== idx));
  };

  const updateManpowerRow = (idx: number, field: string, val: any) => {
    const updated = [...manpower];
    updated[idx][field] = val;
    setManpower(updated);
  };

  const addActivityRow = () => {
    setActivities([...activities, { category: 'Finishes', description: 'Wall plastering', plannedProgress: 20, actualProgress: 0, remarks: '' }]);
  };

  const removeActivityRow = (idx: number) => {
    setActivities(activities.filter((_, i) => i !== idx));
  };

  const updateActivityRow = (idx: number, field: string, val: any) => {
    const updated = [...activities];
    updated[idx][field] = val;
    setActivities(updated);
  };

  const handleSubmitDpr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dprDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        date: new Date(dprDate),
        weather,
        manpower,
        activities,
      };

      const res = await interiorProjectService.createDpr(projectId, payload);
      if (res?.success) {
        toast.success('Daily Progress Report submitted successfully');
        setIsFormOpen(false);
        setDprDate('');
        setWeather('Sunny');
        setManpower([{ trade: 'Electrician', count: 2, contractor: 'Vendor A' }]);
        setActivities([{ category: 'Wiring', description: 'Wall chasing and conduit installation', plannedProgress: 10, actualProgress: 10, remarks: '' }]);
        fetchDprs();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Daily Progress Reports (DPR)</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Log site logs, weather conditions, manpower, and actual task progress.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Submit DPR
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : dprs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No daily progress reports recorded for this project yet. Click &quot;Submit DPR&quot; to register site updates.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {dprs.map((dpr) => (
            <Card key={dpr._id} className="overflow-hidden hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <span className="font-semibold text-sm">
                      {new Date(dpr.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="flex items-center gap-1">
                      <CloudSun className="w-3.5 h-3.5" />
                      Weather: <span className="font-medium text-[hsl(var(--foreground))]">{dpr.weather}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Manpower:{' '}
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        {dpr.manpower.reduce((acc: number, curr: any) => acc + curr.count, 0)} workers
                      </span>
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Site Activities</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dpr.activities.map((act: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-mono uppercase font-semibold">{act.category}</span>
                          <span className="font-semibold text-[hsl(var(--success))]">
                            Progress: {act.actualProgress}% (Target: {act.plannedProgress}%)
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{act.description}</p>
                        {act.remarks && <p className="text-xs text-[hsl(var(--muted-foreground))] italic">Remarks: {act.remarks}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && (
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
                  Log Daily Progress (DPR)
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitDpr}>
                <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">DPR Date</label>
                      <Input required type="date" value={dprDate} onChange={(e) => setDprDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Weather Conditions</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                        value={weather}
                        onChange={(e) => setWeather(e.target.value)}
                      >
                        <option value="Sunny">Sunny</option>
                        <option value="Cloudy">Cloudy</option>
                        <option value="Rainy">Rainy</option>
                        <option value="Heavy Wind">Heavy Wind</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Manpower Registry</h4>
                      <Button type="button" variant="outline" size="sm" onClick={addManpowerRow}>
                        Add Trade
                      </Button>
                    </div>
                    {manpower.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input required placeholder="Trade (e.g. Mason)" value={row.trade} onChange={(e) => updateManpowerRow(idx, 'trade', e.target.value)} />
                        <Input
                          required
                          type="number"
                          min={1}
                          className="w-20"
                          placeholder="Count"
                          value={row.count}
                          onChange={(e) => updateManpowerRow(idx, 'count', parseInt(e.target.value) || 0)}
                        />
                        <Input required placeholder="Contractor Vendor" value={row.contractor} onChange={(e) => updateManpowerRow(idx, 'contractor', e.target.value)} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => removeManpowerRow(idx)}
                          disabled={manpower.length === 1}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Work Progress Checklist</h4>
                      <Button type="button" variant="outline" size="sm" onClick={addActivityRow}>
                        Add Activity
                      </Button>
                    </div>
                    {activities.map((row, idx) => (
                      <div key={idx} className="p-3 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.2)] space-y-3 relative">
                        <button
                          type="button"
                          className="absolute top-2 right-2 p-1 rounded hover:bg-[hsl(var(--muted))]"
                          onClick={() => removeActivityRow(idx)}
                          disabled={activities.length === 1}
                        >
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </button>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <Input required placeholder="Category (e.g. Electrical / Civil)" value={row.category} onChange={(e) => updateActivityRow(idx, 'category', e.target.value)} />
                          </div>
                          <div>
                            <Input
                              required
                              type="number"
                              min={0}
                              max={100}
                              placeholder="Actual progress %"
                              value={row.actualProgress}
                              onChange={(e) => updateActivityRow(idx, 'actualProgress', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <Input required placeholder="Task Description..." value={row.description} onChange={(e) => updateActivityRow(idx, 'description', e.target.value)} />
                        <Input placeholder="Remarks / Blockers..." value={row.remarks} onChange={(e) => updateActivityRow(idx, 'remarks', e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Submit Log
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

'use client';

// Port of interior-os-frontend's projects/[projectId]/utilities/page.tsx.
// TanStack/sonner/zustand replaced with local useState/useEffect + interiorProjectService.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, X } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface InteriorUtilitiesViewProps {
  projectId: string;
}

export default function InteriorUtilitiesView({ projectId }: InteriorUtilitiesViewProps) {
  const toast = useToast();

  const [systems, setSystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<any>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [checkpointStatus, setCheckpointStatus] = useState('passed');
  const [checkpointReadings, setCheckpointReadings] = useState('');
  const [systemProgress, setSystemProgress] = useState(0);

  const fetchUtilities = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getUtilities(projectId);
      if (res.success && res.data) setSystems(res.data);
    } catch (err) {
      console.error('Failed to load utilities', err);
      toast.error('Failed to fetch Utilities checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchUtilities();
  }, [projectId]);

  const handleOpenCheckpointModal = (sys: any, cp: any) => {
    setSelectedSystem(sys);
    setSelectedCheckpoint(cp);
    setCheckpointStatus(cp.status === 'pending' ? 'passed' : cp.status);
    setCheckpointReadings(cp.readings || '');
    setSystemProgress(sys.actualProgress);
    setIsModalOpen(true);
  };

  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUpdating(true);
      const res = await interiorProjectService.updateUtility(projectId, {
        systemId: selectedSystem._id,
        checkpointName: selectedCheckpoint.name,
        status: checkpointStatus,
        readings: checkpointReadings,
        actualProgress: systemProgress,
      });

      if (res.success) {
        toast.success('Utility commissioning checkpoint updated!');
        setIsModalOpen(false);
        fetchUtilities();
      }
    } catch (err) {
      console.error('Failed to update checkpoint', err);
      toast.error('Failed to save checkpoint update');
    } finally {
      setUpdating(false);
    }
  };

  const getSystemIcon = () => Zap; // standard utility icon

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Systems Commissioning & Utilities</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
          Verify and signoff test checklists for Electrical, HVAC, PHE, Fire Fighting, STP, and ELV networks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {systems.map((sys) => {
          const Icon = getSystemIcon();
          return (
            <Card key={sys._id} className="hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <CardHeader className="p-5 border-b border-[hsl(var(--border))] flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wide">{sys.system.replace('_', ' ')}</CardTitle>
                </div>
                <div className="text-xs font-semibold">
                  Progress: <span className="text-[hsl(var(--primary))]">{sys.actualProgress}%</span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300" style={{ width: `${sys.actualProgress}%` }} />
                </div>

                <div className="space-y-2 pt-2">
                  {sys.checkpoints.map((cp: any) => (
                    <div
                      key={cp.name}
                      onClick={() => handleOpenCheckpointModal(sys, cp)}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.35)] transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[hsl(var(--foreground))]">{cp.name}</p>
                        {cp.readings && <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Readings: {cp.readings}</p>}
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[9px] uppercase font-bold border',
                          cp.status === 'passed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : cp.status === 'failed'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        )}
                      >
                        {cp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Update Checkpoint: {selectedCheckpoint?.name}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCheckpoint}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Test Audit Status</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      value={checkpointStatus}
                      onChange={(e) => setCheckpointStatus(e.target.value)}
                    >
                      <option value="pending">Pending Check</option>
                      <option value="passed">Passed Test</option>
                      <option value="failed">Failed Test</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Logged Readings / Notes</label>
                    <Input placeholder="e.g. Pressure 10.2 Bar for 2 hours" value={checkpointReadings} onChange={(e) => setCheckpointReadings(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Overall System Commissioning Progress (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={systemProgress}
                      onChange={(e) => setSystemProgress(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Changes
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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Pencil, Trash2, Download, X, RefreshCw, CheckCircle2, Users,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { cn } from '@/lib/utils';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { isProjectLocked } from '@/lib/permissions';

interface LabourManagementTabProps {
  projectId: string;
}

interface Labour {
  _id: string;
  name: string;
  type: 'Skilled' | 'Unskilled';
  paymentCycle: string;
  wageAmount: number;
  status: string;
}

interface AttendanceState {
  isChecked: boolean;
  status: 'Present' | 'Half Day';
}

const emptyLabourForm = () => ({
  name: '', type: 'Unskilled' as 'Skilled' | 'Unskilled', paymentCycle: 'Monthly', wageAmount: '',
});

export const LabourManagementTab: React.FC<LabourManagementTabProps> = ({ projectId }) => {
  const toast = useToast();
  const { project } = useProjectContext();
  const isLocked = isProjectLocked(project);

  const [loading, setLoading] = useState(true);
  const [labourers, setLabourers] = useState<Labour[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceState>>({});
  const [savedAttendanceState, setSavedAttendanceState] = useState<Record<string, AttendanceState>>({});
  const [isSavedInDB, setIsSavedInDB] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyLabourForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Export modal
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [labourRes, attRes] = await Promise.all([
        api.get(`/labour?projectId=${projectId}`),
        api.get(`/labour-attendance?projectId=${projectId}&date=${selectedDate}`),
      ]);

      const labourData: Labour[] = labourRes.data || [];
      const attData: any[] = attRes.data || [];
      setIsSavedInDB(attData.length > 0);

      const attMap: Record<string, string> = {};
      attData.forEach((r: any) => { attMap[r.labour?._id || r.labour] = r.status; });

      const sorted = [...labourData].sort((a, b) => {
        const aMarked = !!attMap[a._id];
        const bMarked = !!attMap[b._id];
        if (aMarked && !bMarked) return 1;
        if (!aMarked && bMarked) return -1;
        return 0;
      });

      setLabourers(sorted);

      const initialState: Record<string, AttendanceState> = {};
      sorted.forEach(labour => {
        const existingStatus = attMap[labour._id];
        if (existingStatus) {
          initialState[labour._id] = {
            isChecked: existingStatus !== 'Absent',
            status: existingStatus === 'Absent' ? 'Present' : (existingStatus as 'Present' | 'Half Day'),
          };
        } else {
          initialState[labour._id] = { isChecked: true, status: 'Present' };
        }
      });
      setAttendanceState(initialState);
      setSavedAttendanceState(initialState);
    } catch {
      toast.error('Failed to load labour data');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (labour: Labour) => {
    setForm({ name: labour.name, type: labour.type, paymentCycle: labour.paymentCycle, wageAmount: String(labour.wageAmount) });
    setEditingId(labour._id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyLabourForm());
    setEditingId(null);
  };

  const handleSaveLabour = async () => {
    if (isLocked) { toast.error('This project is locked and can no longer be modified.'); return; }
    if (!form.name.trim() || !form.wageAmount) {
      toast.error('Please fill name and wage amount');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/labour/${editingId}`, form);
        toast.success('Labourer updated');
      } else {
        await api.post('/labour', { project: projectId, ...form });
        toast.success('Labourer added successfully');
      }
      closeModal();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save labourer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLabour = async () => {
    if (!editingId) return;
    if (isLocked) { toast.error('This project is locked and can no longer be modified.'); return; }
    setDeleting(true);
    try {
      await api.delete(`/labour/${editingId}`);
      toast.success('Labourer deleted');
      closeModal();
      fetchData();
    } catch {
      toast.error('Failed to delete labourer');
    } finally {
      setDeleting(false);
    }
  };

  const toggleCheck = (id: string) => {
    setAttendanceState(prev => ({ ...prev, [id]: { ...prev[id], isChecked: !prev[id].isChecked } }));
  };

  const toggleHalfDay = (id: string, currentStatus: string) => {
    setAttendanceState(prev => ({ ...prev, [id]: { ...prev[id], status: currentStatus === 'Present' ? 'Half Day' : 'Present' } }));
  };

  const handleSubmitBulk = async () => {
    if (isLocked) { toast.error('This project is locked and can no longer be modified.'); return; }
    setSubmitting(true);
    try {
      const attendances = labourers.map(labour => {
        const state = attendanceState[labour._id];
        return { labourId: labour._id, status: state.isChecked ? state.status : 'Absent' };
      });
      await api.post('/labour-attendance/bulk', { projectId, date: selectedDate, attendances });
      toast.success('Attendance saved successfully');
      fetchData();
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPayroll = async () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error('Please select both start and end dates.');
      return;
    }
    setExporting(true);
    try {
      const response = await api.get(
        `/labour/export?projectId=${projectId}&startDate=${exportStartDate}&endDate=${exportEndDate}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Labour_Payroll_${exportStartDate}_to_${exportEndDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Payroll exported successfully!');
      setExportOpen(false);
    } catch {
      toast.error('Failed to export payroll');
    } finally {
      setExporting(false);
    }
  };

  const filteredLabourers = labourers.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const hasChanges = Object.keys(attendanceState).some(id => {
    const current = attendanceState[id];
    const saved = savedAttendanceState[id] || { isChecked: true, status: 'Present' };
    return current.isChecked !== saved.isChecked || current.status !== saved.status;
  });
  const isSaveDisabled = submitting || (isSavedInDB && !hasChanges);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold focus:outline-none transition-all"
        />
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search labourer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl transition-colors"
            title="Export Payroll"
          >
            <Download className="w-4 h-4" />
          </button>
          {!isLocked && (
            <button
              onClick={() => { setEditingId(null); setModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
      ) : labourers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-400">No labourers added yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="sm:hidden space-y-3">
            {filteredLabourers.map(labour => {
              const state = attendanceState[labour._id] || { isChecked: true, status: 'Present' };
              return (
                <div key={labour._id} className={cn('p-3.5 rounded-xl border border-gray-200 bg-white space-y-2.5', !state.isChecked && 'bg-gray-50/50')}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={state.isChecked}
                      onChange={() => toggleCheck(labour._id)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('font-bold text-sm', state.isChecked ? 'text-gray-900' : 'text-slate-400')}>{labour.name}</p>
                      <p className="text-[10px] text-slate-400">{labour.type} · {labour.paymentCycle} · Wage {labour.wageAmount}</p>
                    </div>
                    <button onClick={() => openEdit(labour)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="pl-7">
                    {state.isChecked ? (
                      <button
                        onClick={() => toggleHalfDay(labour._id, state.status)}
                        className={cn(
                          'px-3 py-1 rounded-full text-[10px] font-bold border transition-colors',
                          state.status === 'Half Day'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        {state.status === 'Half Day' ? 'Half' : 'Full'}
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-red-500">Absent</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 font-bold text-slate-600">
                  <th className="py-3 px-4 w-12">Mark</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 text-center">Day Type</th>
                  <th className="py-3 px-4 text-right">Wage</th>
                  <th className="py-3 px-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLabourers.map(labour => {
                  const state = attendanceState[labour._id] || { isChecked: true, status: 'Present' };
                  return (
                    <tr key={labour._id} className={cn('transition-colors', !state.isChecked && 'bg-gray-50/50')}>
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={state.isChecked}
                          onChange={() => toggleCheck(labour._id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <p className={cn('font-bold', state.isChecked ? 'text-gray-900' : 'text-slate-400')}>{labour.name}</p>
                        <p className="text-[10px] text-slate-400">{labour.type} · {labour.paymentCycle}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {state.isChecked ? (
                          <button
                            onClick={() => toggleHalfDay(labour._id, state.status)}
                            className={cn(
                              'px-3 py-1 rounded-full text-[10px] font-bold border transition-colors',
                              state.status === 'Half Day'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {state.status === 'Half Day' ? 'Half' : 'Full'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-red-500">Absent</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">{labour.wageAmount}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => openEdit(labour)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSubmitBulk}
            disabled={isSaveDisabled}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm transition-all shadow-sm"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Attendance
          </button>
        </>
      )}

      {/* Add / Edit Labour Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm relative z-10 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gray-900 text-base">{editingId ? 'Edit Labourer' : 'Add New Labourer'}</h3>
                <div className="flex items-center gap-1">
                  {editingId && (
                    <button onClick={handleDeleteLabour} disabled={deleting} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                      {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl">
                  {(['Skilled', 'Unskilled'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, type: t }))}
                      className={cn('flex-1 py-2 rounded-lg text-xs font-bold transition-all', form.type === t ? 'bg-white shadow text-gray-900' : 'text-slate-500')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wage Amount</label>
                <input
                  type="number" value={form.wageAmount}
                  onChange={e => setForm(p => ({ ...p, wageAmount: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g. 150"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all text-xs">
                  Cancel
                </button>
                <button
                  onClick={handleSaveLabour}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-all text-xs flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {editingId ? 'Save Changes' : 'Save Labourer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Payroll Modal */}
      <AnimatePresence>
        {exportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExportOpen(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm relative z-10 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gray-900 text-base">Export Payroll</h3>
                <button onClick={() => setExportOpen(false)} className="p-1.5 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date" value={exportStartDate}
                    onChange={e => setExportStartDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">End Date</label>
                  <input
                    type="date" value={exportEndDate}
                    onChange={e => setExportEndDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setExportOpen(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all text-xs">
                  Cancel
                </button>
                <button
                  onClick={handleExportPayroll}
                  disabled={exporting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-all text-xs flex items-center justify-center gap-2"
                >
                  {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

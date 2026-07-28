'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Loader2, LayoutGrid, Trash2, Edit2, X, Check,
  ChevronRight, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/providers/SocketContext';
import { hasProjectPermission } from '@/lib/permissions';
import { useProjectContext } from '../../contexts/ProjectContext';

const ROOM_TYPES = [
  'Living Room', 'Bedroom', 'Master Bedroom', 'Kitchen', 'Bathroom',
  'Dining', 'Office', 'Corridor', 'Balcony', 'Terrace', 'Store',
  'Laundry', 'Entrance', 'Other',
] as const;

const ROOM_STATUSES = ['Planned', 'In Progress', 'Snagging', 'Completed'] as const;

const STATUS_META: Record<string, { color: string; bg: string }> = {
  Planned:      { color: 'text-slate-600',   bg: 'bg-slate-100' },
  'In Progress': { color: 'text-blue-700',    bg: 'bg-blue-50' },
  Snagging:     { color: 'text-amber-700',   bg: 'bg-amber-50' },
  Completed:    { color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const emptyForm = {
  name: '', type: 'Living Room' as typeof ROOM_TYPES[number],
  floor: 1, area: '', areaUnit: 'sqft' as 'sqft' | 'sqm',
  status: 'Planned' as typeof ROOM_STATUSES[number], notes: '',
};

interface RoomsTabProps {
  projectId: string;
  project?: any;
}

export const RoomsTab: React.FC<RoomsTabProps> = ({ projectId, project }) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [ffeItems, setFfeItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = hasProjectPermission(user, project, 'rooms:manage');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, ffeRes] = await Promise.allSettled([
        api.get(`/projects/${projectId}/rooms`),
        api.get(`/projects/${projectId}/ffe`),
      ]);
      if (roomsRes.status === 'fulfilled') setRooms(roomsRes.value.data || []);
      if (ffeRes.status === 'fulfilled') setFfeItems(ffeRes.value.data?.items || []);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  // FFE stats per room
  const roomStats = useMemo(() => {
    const map: Record<string, { total: number; installed: number; cost: number }> = {};
    ffeItems.forEach(item => {
      const roomId = item.room?._id || item.room;
      if (!roomId) return;
      if (!map[roomId]) map[roomId] = { total: 0, installed: 0, cost: 0 };
      map[roomId].total += 1;
      if (item.status === 'Installed') map[roomId].installed += 1;
      map[roomId].cost += (item.unitCost || 0) * (item.quantity || 1);
    });
    return map;
  }, [ffeItems]);

  // Group by floor
  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (room: any) => {
    setEditing(room);
    setForm({
      name: room.name || '', type: room.type || 'Living Room',
      floor: room.floor || 1, area: room.area?.toString() || '',
      areaUnit: room.areaUnit || 'sqft',
      status: room.status || 'Planned', notes: room.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Room name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, area: form.area !== '' ? Number(form.area) : undefined };
      if (editing) {
        await api.patch(`/projects/${projectId}/rooms/${editing._id}`, payload);
        toast.success('Room updated');
      } else {
        await api.post(`/projects/${projectId}/rooms`, payload);
        toast.success('Room added');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room: any) => {
    if (!window.confirm(`Delete room "${room.name}"?`)) return;
    try {
      await api.delete(`/projects/${projectId}/rooms/${room._id}`);
      toast.success('Room deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete room');
    }
  };

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all';

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Rooms & Zones</h3>
          <p className="text-sm text-slate-500">Track interior rooms, FFE progress and completion by floor.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/projects/${projectId}/ffe`)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
          >
            View FFE <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Add Room
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROOM_STATUSES.map(s => {
          const sm = STATUS_META[s];
          const count = rooms.filter(r => r.status === s).length;
          return (
            <div key={s} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s}</p>
              <p className={cn('text-2xl font-black', sm.color)}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Rooms grouped by floor */}
      {floors.length > 0 ? (
        floors.map(floor => (
          <div key={floor} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Floor {floor}</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.filter(r => r.floor === floor).map(room => {
                const stats = roomStats[room._id] || { total: 0, installed: 0, cost: 0 };
                const pct = stats.total > 0 ? Math.round((stats.installed / stats.total) * 100) : 0;
                const sm = STATUS_META[room.status] || STATUS_META.Planned;
                return (
                  <div key={room._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-blue-200 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                          <LayoutGrid className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{room.name}</p>
                          <p className="text-[10px] text-slate-400">{room.type}{room.area ? ` · ${room.area} ${room.areaUnit}` : ''}</p>
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', sm.color, sm.bg)}>{room.status}</span>
                    </div>

                    {/* FFE stats */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-xs font-black text-gray-700">{stats.total}</p>
                        <p className="text-[10px] text-slate-400">FFE Items</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-xs font-black text-emerald-700">{stats.installed}</p>
                        <p className="text-[10px] text-slate-400">Installed</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-xs font-black text-gray-700">${stats.cost >= 1000 ? `${(stats.cost / 1000).toFixed(0)}K` : stats.cost}</p>
                        <p className="text-[10px] text-slate-400">Cost</p>
                      </div>
                    </div>

                    {stats.total > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Installation progress</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}

                    {room.notes && <p className="text-[11px] text-slate-400 italic mb-3 truncate">{room.notes}</p>}

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(room)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold text-slate-600 hover:bg-gray-100 transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => handleDelete(room)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <LayoutGrid className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No rooms added yet</p>
          <p className="text-slate-300 text-xs mt-1">Add rooms to track FFE progress per space</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Room' : 'Add Room'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Room Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Master Suite" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Room Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className={inputCls}>
                      {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Floor</label>
                    <input type="number" min="0" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Area</label>
                    <input type="number" min="0" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Unit</label>
                    <select value={form.areaUnit} onChange={e => setForm(f => ({ ...f, areaUnit: e.target.value as any }))} className={inputCls}>
                      <option value="sqft">sqft</option>
                      <option value="sqm">sqm</option>
                    </select>
                  </div>
                </div>
                {editing && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className={inputCls}>
                      {ROOM_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold text-sm transition-all">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editing ? 'Save' : 'Add Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

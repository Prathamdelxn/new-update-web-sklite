'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Loader2, LayoutGrid, Trash2, Edit2, X, Check,
  ChevronRight, ArrowRight, Search, Filter, Bed, Sofa, Utensils,
  Bath, Monitor, Sun, Box, Shirt, DoorOpen, Ruler, Package,
  CheckCircle2, Clock, AlertTriangle, Layers, Eye, List,
  SlidersHorizontal, ChevronDown, RefreshCw
} from 'lucide-react';
import { cn, formatCurrency, formatCompact } from '@/lib/utils';
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

const STATUS_META: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  Planned:      { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' },
  'In Progress': { color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  dot: 'bg-blue-500' },
  Snagging:     { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  Completed:    { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

// Map room type to visual icon & theme color
const ROOM_TYPE_META: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; border: string }> = {
  'Living Room':    { icon: Sofa,      color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
  'Bedroom':        { icon: Bed,       color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-100' },
  'Master Bedroom': { icon: Bed,       color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-100' },
  'Kitchen':        { icon: Utensils,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
  'Bathroom':       { icon: Bath,      color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-100' },
  'Dining':         { icon: Utensils,  color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-100' },
  'Office':         { icon: Monitor,   color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100' },
  'Corridor':       { icon: DoorOpen,  color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-100' },
  'Balcony':        { icon: Sun,       color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-100' },
  'Terrace':        { icon: Sun,       color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
  'Store':          { icon: Box,       color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200' },
  'Laundry':        { icon: Shirt,     color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100' },
  'Entrance':       { icon: DoorOpen,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'Other':          { icon: LayoutGrid,color: 'text-gray-600',    bg: 'bg-gray-100',   border: 'border-gray-200' },
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

export const RoomsTab: React.FC<RoomsTabProps> = ({ projectId, project: propProject }) => {
  const { project: ctxProject } = useProjectContext();
  const project = propProject || ctxProject;
  const currency = project?.currency || 'AED';

  const [rooms, setRooms] = useState<any[]>([]);
  const [ffeItems, setFfeItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Drawers & Modals
  const [inspectRoom, setInspectRoom] = useState<any>(null);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<any>(null);

  const toast = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();
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
      toast.error('Failed to load rooms data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('room:updated', fetchData);
    socket.on('ffe:updated', fetchData);
    return () => {
      socket.off('room:updated', fetchData);
      socket.off('ffe:updated', fetchData);
    };
  }, [socket, projectId]);

  // FFE stats per room
  const roomStats = useMemo(() => {
    const map: Record<string, { total: number; installed: number; cost: number; items: any[] }> = {};
    ffeItems.forEach(item => {
      const roomId = item.room?._id || item.room;
      if (!roomId) return;
      if (!map[roomId]) map[roomId] = { total: 0, installed: 0, cost: 0, items: [] };
      map[roomId].total += 1;
      map[roomId].items.push(item);
      if (item.status === 'Installed') map[roomId].installed += 1;
      map[roomId].cost += (item.unitCost || 0) * (item.quantity || 1);
    });
    return map;
  }, [ffeItems]);


  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch =
        !searchQuery.trim() ||
        room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatusFilter === 'All' || room.status === selectedStatusFilter;

      const matchesFloor =
        selectedFloorFilter === 'All' || room.floor.toString() === selectedFloorFilter;

      return matchesSearch && matchesStatus && matchesFloor;
    });
  }, [rooms, searchQuery, selectedStatusFilter, selectedFloorFilter]);

  // Group floors
  const floors = useMemo(() => {
    return [...new Set(filteredRooms.map(r => r.floor))].sort((a, b) => a - b);
  }, [filteredRooms]);

  const allAvailableFloors = useMemo(() => {
    return [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  }, [rooms]);

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
        toast.success('Room updated successfully');
      } else {
        await api.post(`/projects/${projectId}/rooms`, payload);
        toast.success('Room added successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteRoom) return;
    try {
      await api.delete(`/projects/${projectId}/rooms/${confirmDeleteRoom._id}`);
      toast.success(`Room "${confirmDeleteRoom.name}" deleted`);
      setConfirmDeleteRoom(null);
      if (inspectRoom?._id === confirmDeleteRoom._id) setInspectRoom(null);
      fetchData();
    } catch {
      toast.error('Failed to delete room');
    }
  };

  const ffeRoute = project?.projectType === 'Interior'
    ? `/interior/projects/${projectId}/ffe`
    : `/projects/${projectId}/ffe`;

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Loading rooms & interior layout...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Rooms & Zones</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
              {rooms.length} {rooms.length === 1 ? 'space' : 'spaces'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage room layouts, dimensions, and track interior FFE progress floor by floor.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(ffeRoute)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Manage FFE</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Room</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Rooms */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500">Total Rooms</span>
            <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl font-semibold text-slate-900">{rooms.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {floors.length} {floors.length === 1 ? 'floor' : 'floors'} tracked
          </p>
        </div>

        {/* In Progress */}
        <button
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'In Progress' ? 'All' : 'In Progress')}
          className={cn(
            'bg-white rounded-xl border p-4 text-left transition-colors cursor-pointer hover:border-blue-300',
            selectedStatusFilter === 'In Progress' ? 'border-blue-400 ring-1 ring-blue-400/30' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500">In Progress</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">
            {rooms.filter(r => r.status === 'In Progress').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active fit-out & work</p>
        </button>

        {/* Snagging */}
        <button
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Snagging' ? 'All' : 'Snagging')}
          className={cn(
            'bg-white rounded-xl border p-4 text-left transition-colors cursor-pointer hover:border-amber-300',
            selectedStatusFilter === 'Snagging' ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500">Under Snagging</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">
            {rooms.filter(r => r.status === 'Snagging').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Quality audit & fixes</p>
        </button>

        {/* Completed */}
        <button
          onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Completed' ? 'All' : 'Completed')}
          className={cn(
            'bg-white rounded-xl border p-4 text-left transition-colors cursor-pointer hover:border-emerald-300',
            selectedStatusFilter === 'Completed' ? 'border-emerald-400 ring-1 ring-emerald-400/30' : 'border-slate-200'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">
            {rooms.filter(r => r.status === 'Completed').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Handover ready</p>
        </button>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms by name, type, floor or notes..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
          {/* Status filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Floor filter */}
          {allAvailableFloors.length > 1 && (
            <select
              value={selectedFloorFilter}
              onChange={(e) => setSelectedFloorFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="All">All Floors</option>
              {allAvailableFloors.map(f => (
                <option key={f} value={f.toString()}>Floor {f}</option>
              ))}
            </select>
          )}

          {/* View mode toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              )}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Rooms Display Grouped by Floor ── */}
      {floors.length > 0 ? (
        floors.map(floor => {
          const roomsOnFloor = filteredRooms.filter(r => r.floor === floor);
          return (
            <div key={floor} className="space-y-2">
              {/* Floor Divider Header */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">
                  Floor {floor} <span className="text-slate-400">· {roomsOnFloor.length} {roomsOnFloor.length === 1 ? 'room' : 'rooms'}</span>
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* View Layout Switcher */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {roomsOnFloor.map(room => {
                    const stats = roomStats[room._id] || { total: 0, installed: 0, cost: 0, items: [] };
                    const pct = stats.total > 0 ? Math.round((stats.installed / stats.total) * 100) : 0;
                    const sm = STATUS_META[room.status] || STATUS_META.Planned;
                    const typeMeta = ROOM_TYPE_META[room.type] || ROOM_TYPE_META.Other;
                    const TypeIcon = typeMeta.icon;

                    return (
                      <div
                        key={room._id}
                        className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-3.5 flex flex-col justify-between group"
                      >
                        <div>
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className={cn('p-2 rounded-lg shrink-0', typeMeta.bg, typeMeta.color)}>
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                  {room.name}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {room.type} {room.area ? `· ${room.area} ${room.areaUnit}` : ''}
                                </p>
                              </div>
                            </div>

                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 flex items-center gap-1.5', sm.bg, sm.color)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', sm.dot)} />
                              {room.status}
                            </span>
                          </div>

                          {/* FFE statistics */}
                          <div className="flex items-center gap-3 text-xs mb-2">
                            <span className="text-slate-500">
                              <span className="font-semibold text-slate-800">{stats.total}</span> FFE
                            </span>
                            <span className="text-slate-500">
                              <span className="font-semibold text-emerald-600">{stats.installed}</span> installed
                            </span>
                            <span className="text-slate-500 font-semibold">
                              {formatCurrency(stats.cost, currency)}
                            </span>
                          </div>

                          {/* FFE Progress Bar */}
                          {stats.total > 0 && (
                            <div className="mb-2">
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {room.notes && (
                            <p className="text-[11px] text-slate-400 italic mb-2 line-clamp-2">
                              "{room.notes}"
                            </p>
                          )}
                        </div>

                        {/* Card Footer Actions */}
                        <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 mt-1">
                          <button
                            onClick={() => setInspectRoom(room)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEdit(room)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Edit Room"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteRoom(room)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Room"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {roomsOnFloor.map(room => {
                    const stats = roomStats[room._id] || { total: 0, installed: 0, cost: 0, items: [] };
                    const pct = stats.total > 0 ? Math.round((stats.installed / stats.total) * 100) : 0;
                    const sm = STATUS_META[room.status] || STATUS_META.Planned;
                    const typeMeta = ROOM_TYPE_META[room.type] || ROOM_TYPE_META.Other;
                    const TypeIcon = typeMeta.icon;

                    return (
                      <div key={room._id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('p-2 rounded-lg shrink-0', typeMeta.bg, typeMeta.color)}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-900 text-sm truncate">{room.name}</h4>
                              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0', sm.bg, sm.color)}>
                                {room.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {room.type} · Floor {room.floor} {room.area ? `· ${room.area} ${room.areaUnit}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-800">{stats.installed} / {stats.total} FFE</p>
                            <p className="text-[10px] text-slate-500">{formatCurrency(stats.cost, currency)}</p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setInspectRoom(room)}
                              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => openEdit(room)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteRoom(room)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      ) : (
        /* Empty State */
        <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-xl p-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {rooms.length === 0 ? 'No rooms added yet' : 'No matching rooms found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {rooms.length === 0
              ? 'Add room spaces to start allocating FFE items, measurements, and floor layouts.'
              : 'Try adjusting your search criteria or floor/status filters.'}
          </p>
          {rooms.length === 0 && isAdmin && (
            <button
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add First Room
            </button>
          )}
        </div>
      )}

      {/* ── Room Details Drawer / Modal ── */}
      <AnimatePresence>
        {inspectRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              onClick={() => setInspectRoom(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{inspectRoom.name}</h3>
                    <p className="text-xs text-slate-500">
                      {inspectRoom.type} • Floor {inspectRoom.floor} {inspectRoom.area ? `• ${inspectRoom.area} ${inspectRoom.areaUnit}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectRoom(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Status & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase text-slate-400">Current Status</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-0.5">{inspectRoom.status}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase text-slate-400">FFE Items Count</span>
                    <p className="text-sm font-extrabold text-purple-700 mt-0.5">
                      {(roomStats[inspectRoom._id]?.total || 0)} Items
                    </p>
                  </div>
                </div>

                {inspectRoom.notes && (
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                    <span className="text-[10px] font-black uppercase text-blue-800">Room Notes</span>
                    <p className="text-xs text-slate-700 mt-1">{inspectRoom.notes}</p>
                  </div>
                )}

                {/* Allocated FFE Items Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      Allocated FFE Items ({roomStats[inspectRoom._id]?.items?.length || 0})
                    </h4>
                    <button
                      onClick={() => router.push(ffeRoute)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage in FFE Tab</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {roomStats[inspectRoom._id]?.items?.length > 0 ? (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {roomStats[inspectRoom._id].items.map((item: any) => (
                        <div key={item._id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.category} • Qty: {item.quantity || 1}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              item.status === 'Installed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                            )}>
                              {item.status || 'Pending'}
                            </span>
                            <span className="font-extrabold text-slate-800">
                              {formatCurrency((item.unitCost || 0) * (item.quantity || 1), currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                      <Package className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">No FFE items assigned to this room yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      const roomToEdit = inspectRoom;
                      setInspectRoom(null);
                      openEdit(roomToEdit);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Room
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Room Modal ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editing ? 'Edit Room' : 'Add Room Space'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. Master Bedroom, Living Lounge, Kitchen"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Room Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                      className={inputCls}
                    >
                      {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Floor Level</label>
                    <input
                      type="number"
                      min="0"
                      value={form.floor}
                      onChange={e => setForm(f => ({ ...f, floor: Number(e.target.value) }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Floor Area</label>
                    <input
                      type="number"
                      min="0"
                      value={form.area}
                      onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                      className={inputCls}
                      placeholder="e.g. 250"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                    <select
                      value={form.areaUnit}
                      onChange={e => setForm(f => ({ ...f, areaUnit: e.target.value as any }))}
                      className={inputCls}
                    >
                      <option value="sqft">sqft</option>
                      <option value="sqm">sqm</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROOM_STATUSES.map(s => {
                      const isSelected = form.status === s;
                      const sm = STATUS_META[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, status: s }))}
                          className={cn(
                            'py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-between',
                            isSelected ? `${sm.bg} ${sm.color} ${sm.border} ring-2 ring-blue-500/20` : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          <span>{s}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Instructions</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className={inputCls}
                    placeholder="Specific design notes, wall finishes or electrical details..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editing ? 'Update Room' : 'Save Room'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Modal ── */}
      <AnimatePresence>
        {confirmDeleteRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              onClick={() => setConfirmDeleteRoom(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Room?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-800">"{confirmDeleteRoom.name}"</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setConfirmDeleteRoom(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Delete Room
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

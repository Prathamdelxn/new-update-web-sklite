'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldPlus,
  MoreVertical,
  Users,
  CheckCircle2,
  Lock,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Info,
  Pencil,
  Trash2
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { RoleModal } from '@/features/users/components/RoleModal';

export const RoleList = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toast = useToast();
  const { confirm } = useConfirm();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data?.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRoleMenuId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [roleMenuId]);

  const handleDeleteRole = async (role: any) => {
    setRoleMenuId(null);
    const ok = await confirm({
      title: 'Delete Role',
      message: `Delete role "${role.name}"? Users with this role will be unassigned.`,
      confirmText: 'Delete Role',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/roles/${role._id}`);
      toast.success(`Role "${role.name}" deleted`);
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const openEdit = (role: any) => {
    setEditingRole(role);
    setRoleMenuId(null);
    setIsModalOpen(true);
  };

  // Loading state handled by Skeleton wrapper

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5 text-slate-500">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <p className="text-xs font-medium text-slate-500">Manage Role-Based Access Control (RBAC) across all projects and features.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
        >
          <ShieldPlus className="w-3.5 h-3.5" />
          <span>Define New Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {roles.map((role) => (
          <div key={role._id} className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-slate-200/80 hover:border-slate-300 hover:shadow-card-hover p-5 flex flex-col h-full transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 shadow-2xs">
                <Shield className="w-4 h-4 transition-colors" />
              </div>
              <div className="relative" ref={roleMenuId === role._id ? menuRef : null}>
                <button
                  onClick={() => setRoleMenuId(roleMenuId === role._id ? null : role._id)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {roleMenuId === role._id && (
                  <div className="absolute right-0 top-9 w-44 bg-white border border-slate-200/80 rounded-2xl shadow-card-hover z-20 overflow-hidden py-1">
                    <button
                      onClick={() => openEdit(role)}
                      className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Role</span>
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Role</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h4 className="text-base font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{role.name}</h4>
            <div className="flex items-center space-x-2 text-slate-400 mb-4 text-xs font-medium">
              <div className="flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>{role.permissions?.length || 0} Permissions</span>
              </div>
            </div>

            <div className="flex-1" />
            <button
              onClick={() => openEdit(role)}
              className="w-full py-2 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all group/btn shadow-2xs"
            >
              <span className="flex items-center justify-center space-x-1.5">
                <span>Manage Permissions</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
              </span>
            </button>
          </div>
        ))}

        {roles.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-500">No roles defined</h3>
            <p className="text-slate-400 mt-1">Start by defining system access levels.</p>
          </div>
        )}
      </div>

      <RoleModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRole(null); }}
        onSuccess={fetchRoles}
        initialData={editingRole}
      />
    </div>
    </SkeletonLoader>
  );
};

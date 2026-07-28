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
import { RoleModal } from '@/features/users/components/RoleModal';

export const RoleList = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toast = useToast();

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load access roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (!roleMenuId) return;
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
    if (!window.confirm(`Delete role "${role.name}"? Users with this role will be unassigned.`)) return;
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
        <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-slate-500">
          <Info className="w-4 h-4" />
          <p className="text-sm">Manage Role-Based Access Control (RBAC) across all projects.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-blue-500/50 hover:bg-blue-50 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-all active:scale-[0.98] shadow-sm"
        >
          <ShieldPlus className="w-4 h-4 text-blue-500" />
          <span>Define New Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {roles.map((role) => (
          <div key={role._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-200 p-6 flex flex-col h-full transition-all group">
            <div className="flex items-start justify-between mb-5">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                <Shield className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="relative" ref={roleMenuId === role._id ? menuRef : null}>
                <button
                  onClick={() => setRoleMenuId(roleMenuId === role._id ? null : role._id)}
                  className="p-1.5 text-slate-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {roleMenuId === role._id && (
                  <div className="absolute right-0 top-9 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => openEdit(role)}
                      className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-slate-400" />
                      <span>Edit Role</span>
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Role</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h4 className="text-lg font-semibold text-gray-900 mb-1.5">{role.name}</h4>
            <div className="flex items-center space-x-3 text-slate-500 mb-5 font-medium text-xs">
              <div className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>{role.permissions?.length || 0} Permissions</span>
              </div>
            </div>

            <div className="flex-1" />            <button
              onClick={() => openEdit(role)}
              className="w-full py-2 px-4 rounded-md bg-gray-50 border border-gray-200 text-sm font-medium text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all group/btn"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>Manage Permissions</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
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

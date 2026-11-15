'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldPlus,
  MoreVertical,
  Lock,
  ChevronRight,
  Info,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useUserManagementPermissions } from '@/features/users/components/UserManagementGate';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { RoleModal } from '@/features/users/components/RoleModal';

export const RoleList = () => {
  const { canCreate, canUpdate, canDelete } = useUserManagementPermissions();
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

  return (
    <SkeletonLoader loading={loading} preset="card-grid">
      <div className="space-y-3.5">
        
        {/* ── Toolbar: Info & Define Role Action ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
              <p>Role-Based Access Control (RBAC) tiers and granular module permissions.</p>
            </div>

            {canCreate && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0 self-end sm:self-auto"
              >
                <ShieldPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create New Role</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Roles Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {roles.map((role) => (
            <div
              key={role._id}
              className="group relative bg-white rounded-xl border border-slate-300 hover:border-blue-400 transition-all duration-200 p-4 overflow-hidden flex flex-col justify-between"
            >
              {/* Top Accent Stripe on hover */}
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 left-0" />

              <div>
                {/* Header row: Shield Icon + Menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Shield className="w-4 h-4 transition-colors" />
                  </div>

                  {(canUpdate || canDelete) && (
                    <div className="relative" ref={roleMenuId === role._id ? menuRef : null}>
                      <button
                        onClick={() => setRoleMenuId(roleMenuId === role._id ? null : role._id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Role options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {roleMenuId === role._id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl z-20 overflow-hidden py-1 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
                          {canUpdate && (
                            <button
                              onClick={() => openEdit(role)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-400" />
                              <span>Edit Role</span>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteRole(role)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Role</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                  {role.name}
                </h4>

                <div className="flex items-center gap-1.5 mb-4">
                  <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200/60">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>{role.permissions?.length || 0} Permissions</span>
                  </span>
                </div>
              </div>

              {canUpdate && (
                <button
                  onClick={() => openEdit(role)}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-between group/btn cursor-pointer mt-2"
                >
                  <span>Manage Permissions</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              )}
            </div>
          ))}

          {roles.length === 0 && (
            <div className="col-span-full py-16 px-6 bg-white rounded-xl border border-slate-300 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
                <Shield className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No roles defined yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Start by configuring role tiers and assigning organizational permissions.
              </p>
              {canCreate && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ShieldPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Define First Role</span>
                </button>
              )}
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

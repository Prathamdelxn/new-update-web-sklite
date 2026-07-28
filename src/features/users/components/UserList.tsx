'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  UserPlus,
  MoreVertical,
  Mail,
  Shield,
  Clock,
  Loader2,
  XCircle,
  Filter,
  Pencil,
  Trash2,
  Phone,
  Users as UsersIcon,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { UserModal } from '@/features/users/components/UserModal';
import { Pagination, usePagination } from '@/components/shared/Pagination';
import { cn } from '@/lib/utils';

export const UserList = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${deletingUser._id}`);
      toast.success(`${deletingUser.name} has been removed`);
      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove user');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setOpenMenuId(null);
    setIsModalOpen(true);
  };

  const openDelete = (user: any) => {
    setDeletingUser(user);
    setOpenMenuId(null);
  };

  const uniqueRoles = Array.from(new Set(users.map(u => typeof u.role === 'object' ? u.role?.name : u.role).filter(Boolean))) as string[];

  const filteredUsers = users.filter(u => {
    const nameMatch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const userRole = typeof u.role === 'object' ? u.role?.name : u.role;
    const roleMatch = !roleFilter || userRole === roleFilter;
    return nameMatch && roleMatch;
  });

  const { currentPage, totalPages, paginated: pagedUsers, setCurrentPage } = usePagination(filteredUsers, 9);

  // Loading state handled by Skeleton wrapper

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-6">

        {/* Org-level summary strip */}
        {!loading && users.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
              <UsersIcon className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">{users.length} Organisation Member{users.length !== 1 ? 's' : ''}</span>
            </div>
            {uniqueRoles.map(role => {
              const count = users.filter(u => (typeof u.role === 'object' ? u.role?.name : u.role) === role).length;
              return (
                <div key={role} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-500">{role}</span>
                  <span className="ml-1.5 text-xs font-black text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu(v => !v)}
              className={`p-3 border rounded-xl transition-all relative ${roleFilter ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-slate-400 hover:text-gray-900'}`}
              title="Filter by role"
            >
              <Filter className="w-5 h-5" />
              {roleFilter && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />}
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Role</p>
                </div>
                <button
                  onClick={() => { setRoleFilter(null); setShowFilterMenu(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors ${!roleFilter ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-gray-50'}`}
                >
                  All Roles
                </button>
                {uniqueRoles.map(role => (
                  <button
                    key={role}
                    onClick={() => { setRoleFilter(role); setShowFilterMenu(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-semibold transition-colors ${roleFilter === role ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-gray-50'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Member</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagedUsers.map((user, idx) => {
          let roleName = typeof user.role === 'object' ? user.role?.name : user.role;
          if (!roleName && user.projects?.length > 0) {
            const firstProjectRole = user.projects.find((p: any) => p.role)?.role;
            if (firstProjectRole) {
              roleName = typeof firstProjectRole === 'object' ? firstProjectRole.name : firstProjectRole;
            } else {
              roleName = 'Project Access';
            }
          }
          
          const getRoleStyle = (r: string) => {
            switch (r?.toLowerCase()) {
              case 'administrator': return { bg: 'bg-red-100', text: 'text-red-500', border: 'border-red-100', dot: 'bg-red-500' };
              case 'site manager': return { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-600' };
              case 'contractor': return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-600' };
              default: return { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-100', dot: 'bg-slate-500' };
            }
          };
          const rStyle = getRoleStyle(roleName);
          const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

          return (
            <GlassCard key={user._id || `user-${idx}`} className="p-4 border-gray-200 transition-all flex items-center justify-between" gradient>
              <div className="flex items-center space-x-4 flex-1 min-w-0 pr-2">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-lg font-black text-white">
                    {initials}
                  </div>
                  {roleName && roleName !== 'No Role' && (
                    <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white", rStyle.dot)} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-slate-900 break-words">{user.name}</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5 mb-1.5 break-all whitespace-normal" title={user.email}>{user.email}</p>
                  
                  {roleName && roleName !== 'No Role' && (
                    <div className={cn("inline-flex items-center px-2 py-1 rounded-lg border", rStyle.bg, rStyle.border)}>
                      <span className={cn("text-[10px] font-black uppercase tracking-wider", rStyle.text)}>
                        {roleName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => openEdit(user)}
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDelete(user)}
                  className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 hover:border-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center text-center">
            <XCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-500">No users found</h3>
            <p className="text-slate-400 mt-1">Try adjusting your search query.</p>
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        onSuccess={fetchUsers}
        initialData={editingUser}
      />

      <ConfirmModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${deletingUser?.name}? This action cannot be undone.`}
        confirmText="Remove"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
    </SkeletonLoader>
  );
};

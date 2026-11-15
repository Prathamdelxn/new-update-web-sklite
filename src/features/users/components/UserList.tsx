'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Mail,
  Shield,
  Filter,
  Pencil,
  Trash2,
  Phone,
  Users as UsersIcon,
  LayoutGrid,
  List,
  Check,
  ChevronDown,
  X,
  XCircle,
  Building2
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { UserModal } from '@/features/users/components/UserModal';
import { Pagination, usePagination } from '@/components/shared/Pagination';
import { cn } from '@/lib/utils';
import { useUserManagementPermissions } from '@/features/users/components/UserManagementGate';
import { useIsAdmin } from '@/hooks/usePermission';
import { useAuth } from '@/providers/AuthContext';

export const UserList = () => {
  const { user: currentUser } = useAuth();
  const { canCreate, canUpdate, canDelete } = useUserManagementPermissions();
  const isViewerAdmin = useIsAdmin();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
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

  // Close filter on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
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
    const roleName = typeof user?.role === 'object' ? user.role?.name : (typeof user?.role === 'string' ? user.role : '');
    const isAdmin =
      roleName?.toLowerCase() === 'admin' ||
      user?.isAdmin === true ||
      user?.isSystemRole === true ||
      (typeof user?.role === 'object' && (
        user.role?.name?.toLowerCase() === 'admin' ||
        user.role?.permissions?.includes('*') ||
        user.role?.isSystemRole === true
      ));

    if (isAdmin) {
      toast.error('Admin accounts are system-protected and cannot be edited.');
      return;
    }
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const openDelete = (user: any) => {
    const roleName = typeof user?.role === 'object' ? user.role?.name : (typeof user?.role === 'string' ? user.role : '');
    const isAdmin =
      roleName?.toLowerCase() === 'admin' ||
      user?.isAdmin === true ||
      user?.isSystemRole === true ||
      (typeof user?.role === 'object' && (
        user.role?.name?.toLowerCase() === 'admin' ||
        user.role?.permissions?.includes('*') ||
        user.role?.isSystemRole === true
      ));

    if (isAdmin) {
      toast.error('Admin accounts are system-protected and cannot be removed.');
      return;
    }
    const isSelf = !!currentUser && (currentUser._id === user._id || (currentUser as any).id === user._id);
    if (isSelf) {
      toast.error("You cannot delete your own account");
      return;
    }
    setDeletingUser(user);
  };

  // Derive unique roles & counts
  const { uniqueRoles, roleCounts } = useMemo(() => {
    const counts: Record<string, number> = { All: users.length };
    const rolesSet = new Set<string>();

    users.forEach((u) => {
      let r = typeof u.role === 'object' ? u.role?.name : u.role;
      if (!r && u.projects?.length > 0) {
        const firstRole = u.projects.find((p: any) => p.role)?.role;
        r = typeof firstRole === 'object' ? firstRole.name : firstRole;
      }
      const roleName = r || 'Member';
      rolesSet.add(roleName);
      counts[roleName] = (counts[roleName] || 0) + 1;
    });

    return {
      uniqueRoles: Array.from(rolesSet),
      roleCounts: counts,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const nameMatch =
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery));

      let userRole = typeof u.role === 'object' ? u.role?.name : u.role;
      if (!userRole && u.projects?.length > 0) {
        const firstRole = u.projects.find((p: any) => p.role)?.role;
        userRole = typeof firstRole === 'object' ? firstRole.name : firstRole;
      }
      const roleName = userRole || 'Member';
      const roleMatch = roleFilter === 'All' || roleName === roleFilter;

      return nameMatch && roleMatch;
    });
  }, [users, searchQuery, roleFilter]);

  const { currentPage, totalPages, paginated: pagedUsers, setCurrentPage } = usePagination(filteredUsers, 9);

  const getRoleStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200/80', dot: 'bg-red-500' };
      case 'site manager':
      case 'project manager':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/80', dot: 'bg-amber-500' };
      case 'contractor':
      case 'surveyor':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80', dot: 'bg-blue-500' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/80', dot: 'bg-slate-400' };
    }
  };

  return (
    <SkeletonLoader loading={loading} preset={viewMode === 'table' ? 'list' : 'card-grid'}>
      <div className="space-y-3.5">
        {/* ── Toolbar: Search, Role Filter, View Mode & Action ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
              {/* Role Filter Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                    roleFilter !== 'All'
                      ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                      : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                  )}
                >
                  <Filter className={cn("w-3.5 h-3.5", roleFilter !== 'All' ? "text-blue-600" : "text-slate-500")} />
                  <span>{roleFilter === 'All' ? 'Filter Role' : roleFilter}</span>
                  {roleFilter !== 'All' && roleCounts[roleFilter] !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-200/80 text-blue-800 tabular-nums">
                      {roleCounts[roleFilter]}
                    </span>
                  )}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-slate-400", isFilterOpen && "rotate-180")} />
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 sm:right-auto sm:left-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 py-1.5 z-30 max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Filter by Role
                      </span>
                      {roleFilter !== 'All' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoleFilter('All');
                            setIsFilterOpen(false);
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {['All', ...uniqueRoles].map((role) => {
                      const isSelected = roleFilter === role;
                      const count = roleCounts[role] ?? 0;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setRoleFilter(role);
                            setIsFilterOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer",
                            isSelected
                              ? "bg-blue-50/80 text-blue-700 font-bold"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={cn("w-3.5 h-3.5 flex items-center justify-center shrink-0", isSelected ? "text-blue-600" : "opacity-0")}>
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate">{role}</span>
                          </div>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded text-[10px] tabular-nums shrink-0 ml-2",
                            isSelected ? "bg-blue-200/70 text-blue-800 font-bold" : "bg-slate-100 text-slate-500 font-semibold"
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    viewMode === 'grid'
                      ? "bg-white text-blue-600 border border-slate-300"
                      : "text-slate-400 hover:text-slate-700"
                  )}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                    viewMode === 'table'
                      ? "bg-white text-blue-600 border border-slate-300"
                      : "text-slate-400 hover:text-slate-700"
                  )}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add Member Button */}
              {canCreate && (
                <button
                  onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add New Member</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Content: Grid or Table View ── */}
        {filteredUsers.length > 0 ? (
          viewMode === 'grid' ? (
            /* ── Grid View ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                const roleLabel = roleName || 'Member';
                const rStyle = getRoleStyle(roleLabel);
                const initials = (user.name || 'User')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .substring(0, 2);

                const isTargetAdmin =
                  roleLabel.toLowerCase() === 'admin' ||
                  (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') ||
                  user.isAdmin === true ||
                  user.isSystemRole === true ||
                  (typeof user.role === 'object' && (
                    user.role?.name?.toLowerCase() === 'admin' ||
                    user.role?.permissions?.includes('*') ||
                    user.role?.isSystemRole === true
                  ));
                const isSelf = !!currentUser && (currentUser._id === user._id || (currentUser as any).id === user._id);
                const showEdit = canUpdate && !isTargetAdmin;
                const showDelete = canDelete && !isTargetAdmin && !isSelf;

                return (
                  <div
                    key={user._id || `user-${idx}`}
                    className="group relative bg-white rounded-xl border border-slate-300 hover:border-blue-400 transition-all duration-200 p-4 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Accent Stripe on hover */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 left-0" />

                    <div>
                      {/* Top Header: Avatar + Info + Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white font-extrabold text-xs flex items-center justify-center">
                              {initials}
                            </div>
                            <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white", rStyle.dot)} />
                          </div>

                          {/* Name & Email */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {user.name}
                            </h4>
                            <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5" title={user.email}>
                              {user.email}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        {(showEdit || showDelete) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {showEdit && (
                              <button
                                onClick={() => openEdit(user)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
                                title="Edit Member"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {showDelete && (
                              <button
                                onClick={() => openDelete(user)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                                title="Remove Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Phone if present */}
                      {user.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-3">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Row: Role Badge + Status */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div className={cn("inline-flex items-center px-2 py-0.5 rounded-md border", rStyle.bg, rStyle.border)}>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", rStyle.text)}>
                          {roleLabel}
                        </span>
                      </div>
                      
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Active Account
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Table View ── */
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Member Name & Email</th>
                      <th className="py-3 px-4">Role Tier</th>
                      <th className="py-3 px-4">Phone / Contact</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
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
                      const roleLabel = roleName || 'Member';
                      const rStyle = getRoleStyle(roleLabel);
                      const initials = (user.name || 'User')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);

                      const isTargetAdmin =
                        roleLabel.toLowerCase() === 'admin' ||
                        (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') ||
                        user.isAdmin === true ||
                        user.isSystemRole === true ||
                        (typeof user.role === 'object' && (
                          user.role?.name?.toLowerCase() === 'admin' ||
                          user.role?.permissions?.includes('*') ||
                          user.role?.isSystemRole === true
                        ));
                      const isSelf = !!currentUser && (currentUser._id === user._id || (currentUser as any).id === user._id);
                      const showEdit = canUpdate && !isTargetAdmin;
                      const showDelete = canDelete && !isTargetAdmin && !isSelf;

                      return (
                        <tr key={user._id || `user-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                          {/* Member info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white font-extrabold text-xs flex items-center justify-center">
                                  {initials}
                                </div>
                                <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white", rStyle.dot)} />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {user.name}
                                </h5>
                                <p className="text-[10.5px] font-medium text-slate-400 truncate" title={user.email}>
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role Column */}
                          <td className="py-3 px-4">
                            <div className={cn("inline-flex items-center px-2 py-0.5 rounded-md border", rStyle.bg, rStyle.border)}>
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider", rStyle.text)}>
                                {roleLabel}
                              </span>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3 px-4">
                            <span className="text-slate-600 font-medium">
                              {user.phone || '—'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            {(showEdit || showDelete) ? (
                              <div className="flex items-center justify-end gap-1">
                                {showEdit && (
                                  <button
                                    onClick={() => openEdit(user)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Edit Member"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {showDelete && (
                                  <button
                                    onClick={() => openDelete(user)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Remove Member"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* ── Empty State ── */
          <div className="col-span-full py-16 px-6 bg-white rounded-xl border border-slate-300 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
              <UsersIcon className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery || roleFilter !== 'All' ? 'No matching members found' : 'No team members added yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchQuery || roleFilter !== 'All'
                ? 'Try modifying your search query or resetting the role filter.'
                : 'Start onboarding your organisation team members to collaborate on projects.'}
            </p>
            {canCreate && (
              <button
                onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add First Member</span>
              </button>
            )}
          </div>
        )}

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

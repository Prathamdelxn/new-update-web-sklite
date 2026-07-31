'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { cn } from '@/lib/utils';

import {
  Users,
  Shield,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  CheckCircle2,
  Clock,
  UserCog,
  Sparkles,
  X,
  Send,
  Trash2,
  Edit,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Pending';
  avatarColor: string;
  lastActive: string;
}

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Alia Bhatt',
    email: 'alia@sky-lite.com',
    role: 'Studio Owner',
    status: 'Active',
    avatarColor: 'bg-blue-600',
    lastActive: 'Active now'
  },
  {
    id: '2',
    name: 'Marcus Vance',
    email: 'marcus@sky-lite.com',
    role: 'Lead Interior Designer',
    status: 'Active',
    avatarColor: 'bg-indigo-600',
    lastActive: '2 hours ago'
  },
  {
    id: '3',
    name: 'Elena Rostova',
    email: 'elena@sky-lite.com',
    role: 'FF&E Procurement Lead',
    status: 'Active',
    avatarColor: 'bg-emerald-600',
    lastActive: 'Yesterday'
  },
  {
    id: '4',
    name: 'David Chen',
    email: 'david@sky-lite.com',
    role: '3D Visualizer & Render Artist',
    status: 'Pending',
    avatarColor: 'bg-sky-600',
    lastActive: 'Invitation Sent'
  }
];

const ROLES_LIST = [
  {
    title: 'Studio Owner',
    usersCount: 1,
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Full administrative access across all interior projects, billing, team management, and client portals.'
  },
  {
    title: 'Lead Interior Designer',
    usersCount: 1,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Create and manage interior projects, room moodboards, finish sign-offs, and client presentations.'
  },
  {
    title: 'FF&E Procurement Lead',
    usersCount: 1,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Manage furniture, lighting, and decor purchase orders, supplier pricing, and delivery schedules.'
  },
  {
    title: '3D Visualizer & Render Artist',
    usersCount: 1,
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Upload 3D renderings, CAD floor plans, material textures, and spatial layouts.'
  },
  {
    title: 'Client Guest',
    usersCount: 0,
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Read-only access to review design proposals, sign-off on material swatches, and view project timelines.'
  }
];

export default function InteriorUsersPage() {
  const toast = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Lead Interior Designer');
  const [isSending, setIsSending] = useState(false);

  // Filtered members
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return toast.error('Please enter a valid email address.');
    
    setIsSending(true);
    setTimeout(() => {
      const newMember: TeamMember = {
        id: String(Date.now()),
        name: inviteName.trim() || inviteEmail.split('@')[0],
        email: inviteEmail.trim(),
        role: inviteRole,
        status: 'Pending',
        avatarColor: 'bg-blue-600',
        lastActive: 'Invitation Sent'
      };

      setMembers([...members, newMember]);
      setIsSending(false);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      toast.success(`Invitation sent to ${newMember.email}`);
    }, 600);
  };

  const handleRemoveMember = (id: string, name: string) => {
    setMembers(members.filter(m => m.id !== id));
    toast.success(`${name} has been removed from the team.`);
  };

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
              <span>Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-bold">Team & Access</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              User Management
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Manage team members, assign interior design studio roles, and control access permissions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
            >
              <UserPlus className="w-4 h-4" /> Invite Team Member
            </button>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Total Team</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{members.length} <span className="text-xs font-normal text-slate-400">({members.filter(m => m.status === 'Active').length} active)</span></p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Defined Roles</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{ROLES_LIST.length} <span className="text-xs font-normal text-slate-400">roles</span></p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Pending Invites</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{members.filter(m => m.status === 'Pending').length} <span className="text-xs font-normal text-slate-400">pending</span></p>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition",
                activeTab === 'members'
                  ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Users className="w-4 h-4" /> Team Members ({members.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition",
                activeTab === 'roles'
                  ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Shield className="w-4 h-4" /> Roles & Permissions ({ROLES_LIST.length})
            </button>
          </div>

          {/* Search & Filter Toolbar (Members View) */}
          {activeTab === 'members' && (
            <div className="flex items-center gap-3 px-1">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium outline-none focus:border-blue-600 transition"
              >
                <option value="All">All Roles</option>
                <option value="Studio Owner">Studio Owner</option>
                <option value="Lead Interior Designer">Lead Designer</option>
                <option value="FF&E Procurement Lead">Procurement Lead</option>
                <option value="3D Visualizer & Render Artist">3D Visualizer</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: MEMBERS LIST TABLE */}
        {activeTab === 'members' && (
          <GlassCard className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Member Name</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Activity</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No team members matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center shrink-0 shadow-2xs",
                              member.avatarColor
                            )}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{member.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{member.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold">
                            {member.role}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {member.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-slate-500 text-[11px]">
                          {member.lastActive}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            title="Remove member"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES_LIST.map((role, idx) => (
              <GlassCard key={idx} className="p-6 bg-white border border-slate-200/80 rounded-3xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", role.badge)}>
                    {role.title}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {role.usersCount} Assigned
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {role.description}
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* INVITE MEMBER MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Invite Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="colleague@studio.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Studio Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
                >
                  <option value="Lead Interior Designer">Lead Interior Designer</option>
                  <option value="FF&E Procurement Lead">FF&E Procurement Lead</option>
                  <option value="3D Visualizer & Render Artist">3D Visualizer & Render Artist</option>
                  <option value="Client Guest">Client Guest (View & Sign-off Only)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs disabled:opacity-60"
                >
                  <Send className="w-4 h-4" /> Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

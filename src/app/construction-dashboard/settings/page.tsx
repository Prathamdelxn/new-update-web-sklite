'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Lock,
  CreditCard,
  Bell,
  Globe,
  HelpCircle,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  LogOut,
  ExternalLink,
  HardHat,
  Eye,
  EyeOff,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  Users,
  Layers,
  ArrowRight,
  KeyRound,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import AppInfoModal from '@/components/settings/AppInfoModal';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'organization' | 'security' | 'billing' | 'preferences' | 'support';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth() as any;
  const toast = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [copiedId, setCopiedId] = useState(false);

  // Profile Form State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Organization Form State
  const [orgData, setOrgData] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Subscription State
  const [subscription, setSubscription] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<{ users?: number; projects?: number }>({});
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Preferences State
  const [notifications, setNotifications] = useState(true);
  const [projectAlerts, setProjectAlerts] = useState(true);
  const [materialAlerts, setMaterialAlerts] = useState(true);
  const [language, setLanguage] = useState('English');
  const [savingLanguage, setSavingLanguage] = useState(false);

  // Modal State
  const [showAppInfo, setShowAppInfo] = useState(false);

  const roleName = user?.role?.name || 'Administrator';
  const isAdmin = roleName.toLowerCase() === 'admin';

  // Synchronize initial state from user
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phoneNumber || '');
      const initialOrgName =
        (typeof user.organization === 'object' && user.organization !== null ? user.organization.name : null) ||
        user.organizationName ||
        '';
      setOrgName(initialOrgName);
    }
  }, [user]);

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) setLanguage(savedLang);
  }, []);

  // Fetch live organization details & subscription stats
  useEffect(() => {
    api
      .get('/organization')
      .then((res) => {
        if (res.data?.organization) {
          setOrgData(res.data.organization);
          if (res.data.organization.name) {
            setOrgName(res.data.organization.name);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrg(false));

    api
      .get('/organization/subscription')
      .then((res) => {
        setSubscription(res.data?.subscription || null);
        if (res.data?.usage) {
          setUsageStats(res.data.usage);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPlan(false));
  }, []);

  // Save Personal Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      return toast.error('Full name is required');
    }

    setSavingProfile(true);
    try {
      const userId = user?.id || user?._id;
      const res = await api.patch(`/users/${userId}`, {
        name: profileName.trim(),
        phoneNumber: profilePhone.trim(),
      });

      const updatedUser = res.data?.user || { ...user, name: profileName.trim(), phoneNumber: profilePhone.trim() };
      if (refreshUser) {
        refreshUser(updatedUser);
      }
      toast.success('Profile details saved successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Organization Name (Admin only)
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      return toast.error('Organization name cannot be empty');
    }

    setSavingOrg(true);
    try {
      const res = await api.patch('/organization', {
        name: orgName.trim(),
      });

      const updatedOrg = res.data?.organization;
      if (refreshUser && user) {
        refreshUser({
          ...user,
          organizationName: orgName.trim(),
          organization: typeof user.organization === 'object' && user.organization !== null
            ? { ...user.organization, name: orgName.trim() }
            : orgName.trim(),
        });
      }
      if (updatedOrg) setOrgData(updatedOrg);
      toast.success('Organization updated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update organization';
      toast.error(msg);
    } finally {
      setSavingOrg(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return toast.error('Please enter your current password');
    if (!newPassword) return toast.error('Please enter a new password');
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters long');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match');

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password. Check current password.';
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  // Copy Workspace ID
  const handleCopyOrgId = () => {
    const orgId = orgData?._id || user?.organizationId || (typeof user?.organization === 'string' ? user?.organization : user?.organization?._id);
    if (!orgId) return;
    navigator.clipboard.writeText(orgId);
    setCopiedId(true);
    toast.success('Workspace ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Toggle Push Notifications
  const handleToggleNotification = async () => {
    const nextVal = !notifications;
    setNotifications(nextVal);
    try {
      await api.patch('/organization/notifications', { pushNotifications: nextVal });
      toast.success(nextVal ? 'Push notifications enabled' : 'Push notifications muted');
    } catch {
      // Non-blocking UI update
    }
  };

  // Save Language
  const handleSaveLanguage = async (newLang: string) => {
    setLanguage(newLang);
    setSavingLanguage(true);
    try {
      localStorage.setItem('language', newLang);
      toast.success(`Language set to ${newLang}`);
    } finally {
      setSavingLanguage(false);
    }
  };

  const currentOrgName =
    orgName ||
    (typeof user?.organization === 'object' && user?.organization !== null ? user.organization.name : null) ||
    user?.organizationName ||
    'Workspace';

  const userInitial = (user?.name || 'Admin').charAt(0).toUpperCase();
  const orgInitial = (currentOrgName || 'W').charAt(0).toUpperCase();

  const TABS = [
    { id: 'profile', label: 'My Profile', icon: User, desc: 'Personal details & role' },
    { id: 'organization', label: 'Organization', icon: Building2, desc: 'Company workspace & team' },
    { id: 'security', label: 'Security', icon: Lock, desc: 'Password & credentials' },
    { id: 'billing', label: 'Plan & Billing', icon: CreditCard, desc: 'Subscription & limits' },
    { id: 'preferences', label: 'Preferences', icon: Bell, desc: 'Notifications & language' },
    { id: 'support', label: 'Support & Legal', icon: HelpCircle, desc: 'About & legal terms' },
  ] as const;

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Top Header & Context Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                Workspace Settings
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Session
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Settings & Preferences
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Configure your personal account, organization workspace, security, and project preferences.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {orgInitial}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Organization</p>
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
                  {currentOrgName}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none',
                    isActive
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Profile & Account */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Identity Hero Card */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-center text-3xl font-extrabold shadow-md border-2 border-white">
                      {orgInitial || userInitial}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Active">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {currentOrgName}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200/60">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        Organization
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        {roleName}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs md:text-sm text-slate-600 mt-2">
                      <p className="flex items-center gap-1.5 font-bold text-slate-900">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user?.name || 'Administrator'}</span>
                      </p>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <p className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user?.email || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Account Status</p>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">Verified & Active</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Industry: <span className="font-semibold text-slate-600">Construction</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Personal Details Form */}
            <form onSubmit={handleSaveProfile} className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Personal Information</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update your contact profile name and phone number.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Email Address <span className="text-[11px] text-slate-400 font-normal">(Primary Login)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-600 outline-none cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">To change login email, contact your super administrator.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Global Role</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled
                      value={roleName}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-600 outline-none cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs md:text-sm hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Organization & Workspace */}
        {activeTab === 'organization' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Organization Identity Card */}
            <form onSubmit={handleSaveOrganization} className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>Organization & Workspace Details</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This organization name is shown in the workspace header, dashboard sidebar, and client reports.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60 flex items-center gap-1">
                    <HardHat className="w-3.5 h-3.5" />
                    Construction Workspace
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Apex Construction Solutions"
                      disabled={!isAdmin || savingOrg}
                      className={cn(
                        'w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20',
                        !isAdmin && 'cursor-not-allowed bg-slate-100 text-slate-500'
                      )}
                    />
                  </div>
                  {!isAdmin && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Only organization administrators can rename this workspace.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Workspace Unique ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={orgData?._id || user?.organizationId || 'Loading...'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2 px-3 text-xs font-mono text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyOrgId}
                      className="shrink-0 p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition"
                      title="Copy ID"
                    >
                      {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Workspace Industry</label>
                  <input
                    type="text"
                    disabled
                    value="Construction & Civil Infrastructure"
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2 px-3 text-xs font-medium text-slate-600 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingOrg || !orgName.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs md:text-sm hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {savingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
                    {savingOrg ? 'Updating...' : 'Save Organization Name'}
                  </button>
                </div>
              )}
            </form>

            {/* Workspace Modules & Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Team & Role Permissions</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage workspace members, assign Project Managers, Finance Managers, Homeowners, and workers.
                    </p>
                  </div>
                </div>
                <Link
                  href="/construction-dashboard/users"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 text-xs font-bold transition"
                >
                  <span>Open Team & Roles Management</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Project Templates & WBS</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Standardize construction templates, work breakdown structures, and default categories.
                    </p>
                  </div>
                </div>
                <Link
                  href="/construction-dashboard/templates"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200/80 text-xs font-bold transition"
                >
                  <span>Manage Templates</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Credentials */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <form onSubmit={handleChangePassword} className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <span>Update Password</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Ensure your account uses a secure password of at least 8 characters.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Current Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-xs md:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-10 text-xs md:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-xs md:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs md:text-sm hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>

            {/* Active Session Info */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span>Session & Device Security</span>
              </h3>
              <p className="text-xs text-slate-500">
                You are currently signed in on this web browser with an active encrypted JWT session.
              </p>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Current Web Session (Active)</p>
                    <p className="text-[11px] text-slate-400">Signed in as {user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Plan & Billing */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-3xl bg-gradient-to-br from-[#0A2952] to-[#0E3B7B] text-white p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-blue-200">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Subscription Plan</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {loadingPlan ? 'Loading Plan...' : `${subscription?.plan || 'Silver'} Plan`}
                </h3>
                <p className="text-xs md:text-sm text-blue-100/90 leading-relaxed">
                  Your workspace includes full access to BOQs, site drawings, milestone budgets, daily progress logs, and multi-user roles.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href="/construction-dashboard/settings/plan-billing"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0A2952] font-bold text-xs md:text-sm hover:bg-blue-50 transition shadow-sm"
                  >
                    <span>Manage Plan & Billing</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Usage Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Team Members</p>
                <p className="text-2xl font-black text-slate-900 mt-2">{usageStats.users || 1}</p>
                <p className="text-[11px] text-slate-400 mt-1">Included in your plan</p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Projects</p>
                <p className="text-2xl font-black text-slate-900 mt-2">{usageStats.projects || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Unlimited project tracking</p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs sm:col-span-2 md:col-span-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage & Cloud Sync</p>
                <p className="text-2xl font-black text-emerald-600 mt-2">Active</p>
                <p className="text-[11px] text-slate-400 mt-1">Real-time mobile & web sync</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Preferences */}
        {activeTab === 'preferences' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Notifications Card */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span>Notification Preferences</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Control how and when you receive system alerts and activity updates.</p>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-900">Push Notifications</p>
                    <p className="text-xs text-slate-500 mt-0.5">Receive immediate notifications for critical site events.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleNotification}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      notifications ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        notifications ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-900">Project Milestone & Task Alerts</p>
                    <p className="text-xs text-slate-500 mt-0.5">Alerts when milestone statuses change or snag items are assigned.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProjectAlerts(!projectAlerts)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      projectAlerts ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        projectAlerts ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs md:text-sm font-bold text-slate-900">Material Requests & Purchase Updates</p>
                    <p className="text-xs text-slate-500 mt-0.5">Notifies when materials are requested, approved, or received on site.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaterialAlerts(!materialAlerts)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      materialAlerts ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        materialAlerts ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Language & Regional */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span>Language & Regional Display</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Select your preferred user interface language.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['English', 'Hindi', 'Spanish', 'French', 'Arabic', 'German'].map((lang) => {
                  const isSelected = language === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleSaveLanguage(lang)}
                      className={cn(
                        'flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition cursor-pointer',
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <span>{lang}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Support & Legal */}
        {activeTab === 'support' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Application Information</h4>
                    <p className="text-xs text-slate-500 mt-1">SkyStruct Lite Construction Management Platform v1.0.0</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppInfo(true)}
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 text-xs font-bold transition cursor-pointer"
                >
                  <span>View System & Version Specs</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Terms & Conditions</h4>
                    <p className="text-xs text-slate-500 mt-1">Review our service agreement, SLA and privacy terms.</p>
                  </div>
                </div>
                <Link
                  href="/construction-dashboard/settings/terms"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 text-xs font-bold transition"
                >
                  <span>Read Terms & Conditions</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Help & Contact Banner */}
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Need help or enterprise onboarding?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Our construction software specialists are available to help you set up BOQs, templates, and team roles.
                </p>
              </div>
              <a
                href="mailto:support@skystruct.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-800 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition shadow-2xs shrink-0"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        )}
      </div>

      <AppInfoModal
        open={showAppInfo}
        onClose={() => setShowAppInfo(false)}
      />
    </>
  );
}

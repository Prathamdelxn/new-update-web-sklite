'use client';
import { tr } from '@/i18n';

import { LanguageSelector } from '@/components/interior/LanguageSwitcher';
import React, { useState, useEffect } from 'react';
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
  Copy,
  Check,
  Loader2,
  HardHat,
  Eye,
  EyeOff,
  Users,
  Layers,
  ArrowRight,
  KeyRound,
  FileText,
  Info,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import AppInfoModal from '@/components/settings/AppInfoModal';
import { cn } from '@/lib/utils';

type SettingsTab =
  | 'profile'
  | 'organization'
  | 'security'
  | 'billing'
  | 'preferences'
  | 'support';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth() as any;
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
  const [usageStats, setUsageStats] = useState<{
    users?: number;
    projects?: number;
  }>({});
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Preferences State
  const [notifications, setNotifications] = useState(true);
  const [projectAlerts, setProjectAlerts] = useState(true);
  const [materialAlerts, setMaterialAlerts] = useState(true);
  const [language, setLanguage] = useState('English');

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
        (typeof user.organization === 'object' && user.organization !== null
          ? user.organization.name
          : null) ||
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
      return toast.error(tr("Full name is required"));
    }

    setSavingProfile(true);
    try {
      const userId = user?.id || user?._id;
      const res = await api.patch(`/users/${userId}`, {
        name: profileName.trim(),
        phoneNumber: profilePhone.trim(),
      });

      const updatedUser = res.data?.user || {
        ...user,
        name: profileName.trim(),
        phoneNumber: profilePhone.trim(),
      };
      if (refreshUser) {
        refreshUser(updatedUser);
      }
      toast.success(tr("Profile details saved successfully!"));
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
      return toast.error(tr("Organization name cannot be empty"));
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
          organization:
            typeof user.organization === 'object' && user.organization !== null
              ? { ...user.organization, name: orgName.trim() }
              : orgName.trim(),
        });
      }
      if (updatedOrg) setOrgData(updatedOrg);
      toast.success(tr("Organization updated successfully!"));
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
    if (!currentPassword)
      return toast.error(tr("Please enter your current password"));
    if (!newPassword) return toast.error(tr("Please enter a new password"));
    if (newPassword.length < 8)
      return toast.error(tr("New password must be at least 8 characters long"));
    if (newPassword !== confirmPassword)
      return toast.error(tr("New passwords do not match"));

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success(tr("Password changed successfully!"));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Failed to change password. Check current password.';
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  // Copy Workspace ID
  const handleCopyOrgId = () => {
    const orgId =
      orgData?._id ||
      user?.organizationId ||
      (typeof user?.organization === 'string'
        ? user?.organization
        : user?.organization?._id);
    if (!orgId) return;
    navigator.clipboard.writeText(orgId);
    setCopiedId(true);
    toast.success(tr("Workspace ID copied to clipboard"));
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Toggle Push Notifications
  const handleToggleNotification = async () => {
    const nextVal = !notifications;
    setNotifications(nextVal);
    try {
      await api.patch('/organization/notifications', {
        pushNotifications: nextVal,
      });
      toast.success(
        nextVal ? tr("Push notifications enabled") : tr("Push notifications muted")
      );
    } catch {
      // Non-blocking UI update
    }
  };

  // Save Language
  const handleSaveLanguage = async (newLang: string) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('language', newLang);
      toast.success(tr("Language set to {{newLang}}", { newLang: newLang }));
    } catch {
      // silent
    }
  };

  const currentOrgName =
    orgName ||
    (typeof user?.organization === 'object' && user?.organization !== null
      ? user.organization.name
      : null) ||
    user?.organizationName ||
    'Workspace';

  const userInitial = (user?.name || 'Admin').charAt(0).toUpperCase();
  const orgInitial = (currentOrgName || 'W').charAt(0).toUpperCase();

  const TABS = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Bell },
    { id: 'support', label: 'Support & Legal', icon: HelpCircle },
  ] as const;

  return (
    <>
      <div className="space-y-4">
        {/* ── Top Hero Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {tr("Settings & ")}{tr("Preferences")}
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {tr("Configure your personal account, organization workspace, security, and project preferences.")}
            </p>
          </div>
        </div>

        {/* ── Tab Navigation Toolbar ── */}
        <div className="bg-white border border-slate-300 rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                )}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5',
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  )}
                />
                <span>{tr(tab.label)}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Profile & Account ── */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Identity Hero Card */}
            <div className="rounded-xl bg-white border border-slate-300 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center text-lg font-bold">
                      {orgInitial || userInitial}
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                      title={tr("Active")}
                    >
                      <Check className="w-2 h-2 stroke-[3]" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">
                        {tr(currentOrgName)}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider border border-blue-200">
                        <Building2 className="w-3 h-3 text-blue-600" />
                        {tr("Organization")}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border border-slate-200">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        {tr(roleName)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user?.name || tr("Administrator")}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1.5 text-slate-500 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user?.email || 'N/A'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {tr("Verified & Active")}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {tr("Industry:")}{' '}
                    <span className="font-semibold text-slate-600">
                      {tr("Construction")}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Personal Details Form */}
            <form
              onSubmit={handleSaveProfile}
              className="rounded-xl bg-white border border-slate-300 p-5 space-y-4"
            >
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  {tr("Personal Information")}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tr("Update your contact profile name and phone number.")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Full Name ")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder={tr("e.g. John Doe")}
                      className="w-full ps-9.5 pe-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Email Address")}{' '}
                    <span className="text-[11px] text-slate-400 font-normal">
                      {tr("(Primary Login)")}
                    </span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full ps-9.5 pe-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {tr("To change login email, contact your super administrator.")}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Phone Number")}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full ps-9.5 pe-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Global Role")}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled
                      value={roleName}
                      className="w-full ps-9.5 pe-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>
                    {savingProfile ? tr("Saving Changes...") : tr("Save Profile Changes")}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tab 2: Organization & Workspace ── */}
        {activeTab === 'organization' && (
          <div className="space-y-4">
            {/* Organization Identity Card */}
            <form
              onSubmit={handleSaveOrganization}
              className="rounded-xl bg-white border border-slate-300 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>{tr("Organization & Workspace Details")}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {tr("This organization name is shown in the workspace header, dashboard sidebar, and reports.")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200 flex items-center gap-1">
                    <HardHat className="w-3.5 h-3.5" />
                    {tr("Construction Workspace")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Organization Name ")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder={tr("e.g. Apex Construction Solutions")}
                      disabled={!isAdmin || savingOrg}
                      className={cn(
                        'w-full ps-9.5 pe-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300',
                        !isAdmin && 'cursor-not-allowed bg-slate-50 text-slate-500'
                      )}
                    />
                  </div>
                  {!isAdmin && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      {tr("Only organization administrators can rename this workspace.")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Workspace Unique ID")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        orgData?._id || user?.organizationId || 'Loading...'
                      }
                      className="w-full ps-3 pe-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-mono text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyOrgId}
                      className="shrink-0 p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition cursor-pointer"
                      title={tr("Copy ID")}
                    >
                      {copiedId ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Workspace Industry")}
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Construction & Civil Infrastructure"
                    className="w-full ps-3 pe-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-600 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingOrg || !orgName.trim()}
                    className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingOrg && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>
                      {savingOrg ? tr("Updating...") : tr("Save Organization Name")}
                    </span>
                  </button>
                </div>
              )}
            </form>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white border border-slate-300 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {tr("Team & Role Permissions")}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr("Manage workspace members, assign Project Managers, Engineers, and Contractors.")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/construction-dashboard/users"
                  className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 text-xs font-bold transition"
                >
                  <span>{tr("Open Members & Roles")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="rounded-xl bg-white border border-slate-300 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-150 flex items-center justify-center shrink-0">
                    <Layers className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {tr("Project Templates & Categories")}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr("Standardize construction templates, budgets, and categorization structures.")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/construction-dashboard/templates"
                  className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/80 text-xs font-bold transition"
                >
                  <span>{tr("Manage Templates")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Security & Credentials ── */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <form
              onSubmit={handleChangePassword}
              className="rounded-xl bg-white border border-slate-300 p-5 space-y-4"
            >
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>{tr("Update Account Password")}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tr("Ensure your account uses a secure password of at least 8 characters.")}
                </p>
              </div>

              <div className="space-y-3.5 max-w-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Current Password")}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ps-9.5 pe-10 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("New Password")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={tr("Min. 8 characters")}
                      className="w-full ps-9.5 pe-10 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("Confirm New Password")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={tr("Re-enter new password")}
                      className="w-full ps-9.5 pe-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingPassword && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>
                    {savingPassword ? tr("Updating Password...") : tr("Update Password")}
                  </span>
                </button>
              </div>
            </form>

            {/* Active Session Info */}
            <div className="rounded-xl bg-white border border-slate-300 p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>{tr("Session & Device Security")}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {tr("You are currently signed in on this web browser with an active encrypted session.")}
              </p>

              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {tr("Current Web Session (Active)")}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {tr("Signed in as ")}{user?.email}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {tr("Secure")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 4: Plan & Billing ── */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-900 text-white p-5 border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  <span>{tr("Subscription Plan")}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {tr("Active Subscription")}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {loadingPlan
                    ? tr("Loading Plan...")
                    : `${subscription?.plan || 'Enterprise'} Plan`}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  {tr("Your workspace includes full access to BOQs, site drawings, milestone budgets, daily progress logs, and multi-user governance.")}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/construction-dashboard/settings/plan-billing"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition"
                >
                  <span>{tr("Manage Plan & Invoices")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Usage Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div className="rounded-xl bg-white border border-slate-300 p-4">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {tr("Active Team Members")}
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {usageStats.users || 1}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {tr("Included in your plan")}
                </p>
              </div>

              <div className="rounded-xl bg-white border border-slate-300 p-4">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {tr("Active Projects")}
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {usageStats.projects || 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {tr("Unlimited project tracking")}
                </p>
              </div>

              <div className="rounded-xl bg-white border border-slate-300 p-4 sm:col-span-2 md:col-span-1">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {tr("Storage & Cloud Sync")}
                </p>
                <p className="text-xl font-bold text-emerald-600 mt-1">
                  {tr("Active")}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {tr("Real-time mobile & web sync")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 5: Preferences ── */}
        {activeTab === 'preferences' && (
          <div className="space-y-4">
            {/* Notifications Card */}
            <div className="rounded-xl bg-white border border-slate-300 p-5 space-y-3">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>{tr("Notification Preferences")}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tr("Control how and when you receive system alerts and activity updates.")}
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {tr("Push Notifications")}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr("Receive immediate notifications for critical site events.")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleNotification}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      notifications ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out',
                        notifications ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {tr("Project Milestone & Task Alerts")}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr("Alerts when milestone statuses change or snag items are assigned.")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProjectAlerts(!projectAlerts)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      projectAlerts ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out',
                        projectAlerts ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {tr("Material Requests & Purchase Updates")}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr("Notifies when materials are requested, approved, or received on site.")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaterialAlerts(!materialAlerts)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      materialAlerts ? 'bg-blue-600' : 'bg-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white ring-0 transition duration-200 ease-in-out',
                        materialAlerts ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Language & Regional */}
            <div className="rounded-xl bg-white border border-slate-300 p-5 space-y-3">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>{tr("Language & Regional Display")}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tr("Choose the language for the app. Arabic switches the layout to right-to-left.")}
                </p>
              </div>

              {/* Real switch (English / Arabic with right-to-left), same as the mobile app */}
              <LanguageSelector />
            </div>
          </div>
        )}

        {/* ── Tab 6: Support & Legal ── */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white border border-slate-300 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0">
                    <Info className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {tr("Application Information")}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr("SkyStruct Lite Construction Management Platform v1.0.0")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppInfo(true)}
                  className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 text-xs font-bold transition cursor-pointer"
                >
                  <span>{tr("View System Specs")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="rounded-xl bg-white border border-slate-300 p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 flex items-center justify-center shrink-0">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {tr("Terms & Conditions")}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tr("Review service agreements, data protection, and SLA.")}
                    </p>
                  </div>
                </div>
                <Link
                  href="/construction-dashboard/settings/terms"
                  className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 text-xs font-bold transition"
                >
                  <span>{tr("Read Terms & Conditions")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Help & Contact Banner */}
            <div className="rounded-xl bg-slate-50 border border-slate-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {tr("Need help or enterprise onboarding?")}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tr("Our specialists are available to help you set up BOQs, templates, and permissions.")}
                </p>
              </div>
              <a
                href="mailto:support@skystruct.com"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 text-xs font-bold transition shrink-0"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>{tr("Contact Support")}</span>
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

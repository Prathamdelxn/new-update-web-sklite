'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import AppInfoModal from '@/components/settings/AppInfoModal';
import { cn } from '@/lib/utils';

import {
  User,
  Building,
  Ruler,
  Bell,
  CreditCard,
  Lock,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
  Save,
  Palette,
  Info,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Mail,
  Phone,
  Laptop,
  Moon,
  Sun,
  Eye,
  EyeOff,
  DollarSign,
  MapPin,
  LogOut,
  Sliders,
  ShieldAlert
} from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'profile', label: 'My Account', icon: User, desc: 'Personal details & credentials' },
  { id: 'organization', label: 'Company & Workspace', icon: Building, desc: 'Firm details & currency' },
  { id: 'security', label: 'Security & Sessions', icon: Lock, desc: 'Password & active logins' },
  { id: 'preferences', label: 'App Preferences', icon: Sliders, desc: 'Language, theme & formats' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email & in-app alerts' },
];

export default function InteriorSettingsPage() {
  const { user, refreshUser, logout } = useAuth() as any;
  const toast = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('profile');

  // Account State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Organization State
  const [orgName, setOrgName] = useState('');
  const [currency, setCurrency] = useState('USD ($)');
  const [measurementUnit, setMeasurementUnit] = useState<'metric' | 'imperial'>('metric');
  const [companyAddress, setCompanyAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

  // Preferences State
  const [language, setLanguage] = useState('English');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [isUpdatingPref, setIsUpdatingPref] = useState(false);

  // Notification Toggles
  const [emailProjects, setEmailProjects] = useState(true);
  const [emailApprovals, setEmailApprovals] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const [showAppInfo, setShowAppInfo] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || user.phone || '');
      setOrgName(user.organization?.name || `${user.name || 'Studio'}'s Workspace`);
    }
  }, [user]);

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name cannot be empty.');
    setIsUpdatingProfile(true);
    try {
      await api.patch('/user/profile', { name, phoneNumber: phone });
      if (refreshUser) refreshUser({ name, phoneNumber: phone });
      toast.success('Profile details saved successfully!');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return toast.error('Please enter your current password.');
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match.');

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password.';
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingOrg(true);
    setTimeout(() => {
      setIsUpdatingOrg(false);
      toast.success('Workspace details saved!');
    }, 500);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPref(true);
    localStorage.setItem('language', language);
    setTimeout(() => {
      setIsUpdatingPref(false);
      toast.success('Application preferences updated!');
    }, 400);
  };

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-5 pb-12">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
              <span>Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-bold">Settings</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Configure your personal account, studio details, security settings, and app preferences.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAppInfo(true)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition shadow-xs self-start md:self-auto"
          >
            <Info className="w-4 h-4 text-blue-600" /> App Info
          </button>
        </div>

        {/* Layout Grid: Left Sidebar Navigation & Right Active Tab Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Vertical Subnav Bar */}
          <aside className="lg:col-span-4 space-y-2">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-2.5 shadow-xs space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-left transition-all duration-200 border",
                      isActive
                        ? "bg-blue-50/80 text-blue-900 border-blue-200/80 font-bold shadow-2xs"
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-xl shrink-0 transition-colors",
                      isActive ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-500"
                    )}>
                      <Icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-bold truncate leading-tight">{tab.label}</p>
                      <p className={cn("text-[11px] truncate mt-0.5 leading-tight", isActive ? "text-blue-600 font-medium" : "text-slate-400")}>
                        {tab.desc}
                      </p>
                    </div>

                    {isActive && <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            
          </aside>

          {/* Right Main Settings Pane */}
          <main className="lg:col-span-8">
            {/* TAB 1: MY ACCOUNT */}
            {activeTab === 'profile' && (
              <GlassCard className="p-6 md:p-8 bg-white border border-slate-200/80 space-y-6 shadow-xs rounded-3xl" gradient>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">Personal Profile Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your personal account details and public information.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed font-medium"
                        />
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Account
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-60"
                    >
                      {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Profile
                    </button>
                  </div>
                </form>
              </GlassCard>
            )}

            {/* TAB 2: STUDIO & WORKSPACE */}
            {activeTab === 'organization' && (
              <GlassCard className="p-6 md:p-8 bg-white border border-slate-200/80 space-y-6 shadow-xs rounded-3xl" gradient>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">Studio & Workspace Configuration</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Customize studio branding, measurement scales, default currency, and address.</p>
                </div>

                <form onSubmit={handleSaveOrg} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio / Workspace Name</label>
                      <div className="relative">
                        <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Default Currency</label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                        >
                          <option value="USD ($)">USD ($) - US Dollar</option>
                          <option value="EUR (€)">EUR (€) - Euro</option>
                          <option value="GBP (£)">GBP (£) - British Pound</option>
                          <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                          <option value="AED (AED)">AED (AED) - UAE Dirham</option>
                        </select>
                      </div>
                    </div>
                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Studio Address</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          placeholder="Design District, Suite 402"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Tax ID / GST Number</label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="TAX-9948102"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingOrg}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-60"
                    >
                      {isUpdatingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Workspace Settings
                    </button>
                  </div>
                </form>
              </GlassCard>
            )}

            {/* TAB 3: SECURITY & SESSIONS */}
            {activeTab === 'security' && (
              <GlassCard className="p-6 md:p-8 bg-white border border-slate-200/80 space-y-6 shadow-xs rounded-3xl" gradient>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">Security & Credentials</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Update your password and review active browser sessions.</p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-60"
                  >
                    {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Update Password
                  </button>
                </form>

                {/* Active Sessions */}
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Login Sessions</h3>
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Current Web Browser Session</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Windows • Chrome • Active Now</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      Current Device
                    </span>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* TAB 4: APP PREFERENCES */}
            {activeTab === 'preferences' && (
              <GlassCard className="p-6 md:p-8 bg-white border border-slate-200/80 space-y-6 shadow-xs rounded-3xl" gradient>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">Application Preferences</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Set language, date formatting, and appearance theme.</p>
                </div>

                <form onSubmit={handleSavePreferences} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Display Language</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                      >
                        <option value="English">English (United States)</option>
                        <option value="Spanish">Spanish (Español)</option>
                        <option value="French">French (Français)</option>
                        <option value="German">German (Deutsch)</option>
                        <option value="Arabic">Arabic (العربية)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Date Display Format</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (29/07/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (07/29/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-07-29)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingPref}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-sm disabled:opacity-60"
                  >
                    {isUpdatingPref ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Preferences
                  </button>
                </form>
              </GlassCard>
            )}

            {/* TAB 5: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <GlassCard className="p-6 md:p-8 bg-white border border-slate-200/80 space-y-6 shadow-xs rounded-3xl" gradient>
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900">Notification Alerts</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Control when and how you receive project updates and client alerts.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Project Activity Emails</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Receive email alerts for new project milestones and updates.</p>
                    </div>
                    <button type="button" onClick={() => setEmailProjects(!emailProjects)}>
                      {emailProjects ? <ToggleRight className="w-9 h-9 text-blue-600" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Client Finish Approvals</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Instant alerts when a client signs off on material swatches.</p>
                    </div>
                    <button type="button" onClick={() => setEmailApprovals(!emailApprovals)}>
                      {emailApprovals ? <ToggleRight className="w-9 h-9 text-blue-600" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60">
                    <div>
                      <p className="text-xs font-bold text-slate-900">In-App Audio Alerts</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Play subtle audio notification chimes for active alerts.</p>
                    </div>
                    <button type="button" onClick={() => setSoundAlerts(!soundAlerts)}>
                      {soundAlerts ? <ToggleRight className="w-9 h-9 text-blue-600" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}
          </main>
        </div>
      </div>

      <AppInfoModal
        open={showAppInfo}
        onClose={() => setShowAppInfo(false)}
      />
    </Shell>
  );
}

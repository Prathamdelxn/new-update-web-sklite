'use client';
import { tr } from '@/i18n';

// =============================================================================
// Sky-Lite Web — InteriorOS Modern Enterprise Settings & Workspace
// Aligned with Projects, Vendors, Users & Roles, and Audit Management UI Layout
// =============================================================================

import { LanguageSelector } from '@/components/interior/LanguageSwitcher';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  User,
  Globe2,
  Lock,
  Save,
  Loader2,
  Mail,
  Phone,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import interiorApiClient from '@/services/interiorApi.client';
import { getInteriorUser } from '@/lib/interiorAuth';
import {
  fetchGlobalCountries,
  getLocalCountries,
  CountryInfo,
  findCountry,
} from '@/services/country.service';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

type SettingsTab = 'general' | 'profile' | 'localization' | 'security';

export default function InteriorSettingsView() {
  const toast = useToast();
  const [selectedTab, setActiveTab] = useState<SettingsTab>('general');
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Company profile and regional settings permissions
  const { isOrgAdmin, hasPermission } = usePermissions();
  const canReadSettings = isOrgAdmin || hasPermission('settings', 'read');
  const canUpdateSettings = isOrgAdmin || hasPermission('settings', 'update');
  const activeTab: SettingsTab =
    !canReadSettings && (selectedTab === 'general' || selectedTab === 'localization') ? 'profile' : selectedTab;
  const [loading, setLoading] = useState(true);

  // User Profile State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [avatar, setAvatar] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security / Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Organization & Regional State
  const [countries, setCountries] = useState<CountryInfo[]>(() => getLocalCountries());
  const [orgForm, setOrgForm] = useState({
    id: '',
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    country: 'India',
    countryCode: 'IN',
    currency: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    subscription: {
      plan: 'Enterprise Pro',
      status: 'active',
      validUntil: null as string | null,
    },
  });
  const [savingOrg, setSavingOrg] = useState(false);

  // Fetch live countries & account data
  useEffect(() => {
    fetchGlobalCountries().then((list) => {
      if (list && list.length > 0) setCountries(list);
    });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, orgRes] = await Promise.allSettled([
        interiorApiClient.get('/auth/me'),
        interiorApiClient.get('/organizations/settings'),
      ]);

      if (meRes.status === 'fulfilled' && meRes.value.data?.data) {
        const data = meRes.value.data.data;
        const u = data.user;
        setCurrentUser(u);
        setProfileForm({
          firstName: u?.firstName || '',
          lastName: u?.lastName || '',
          phone: u?.phone || u?.phoneNumber || '',
        });
        setAvatar(u?.avatar || '');

        if (data.organization) {
          const org = data.organization;
          const countryName = org.address?.country || 'India';
          const matched = findCountry(countryName) || findCountry('IN');
          setOrgForm((prev) => ({
            ...prev,
            id: org.id || org._id,
            name: org.name || '',
            slug: org.slug || '',
            email: org.email || '',
            phone: org.phone || '',
            address: org.address?.street || '',
            city: org.address?.city || '',
            state: org.address?.state || '',
            pincode: org.address?.postalCode || '',
            gstNumber: org.taxNumber || org.gstNumber || '',
            country: countryName,
            countryCode: matched?.cca2 || 'IN',
            currency: org.settings?.currency || matched?.currencyCode || 'INR',
            currencySymbol: matched?.currencySymbol || '₹',
            timezone: org.settings?.timezone || matched?.primaryTimezone || 'Asia/Kolkata',
            dateFormat: org.settings?.dateFormat || 'DD/MM/YYYY',
            subscription: org.subscription || prev.subscription,
          }));
        }
      } else {
        const localU = getInteriorUser();
        if (localU) {
          setCurrentUser(localU);
          setProfileForm({
            firstName: localU.firstName || '',
            lastName: localU.lastName || '',
            phone: localU.phone || localU.phoneNumber || '',
          });
          setAvatar(localU.avatar || '');
        }
      }

      if (orgRes.status === 'fulfilled' && orgRes.value.data?.data) {
        const org = orgRes.value.data.data;
        const countryName = org.address?.country || 'India';
        const matched = findCountry(countryName) || findCountry('IN');
        setOrgForm((prev) => ({
          ...prev,
          id: org.id || org._id || prev.id,
          name: org.name || prev.name,
          slug: org.slug || prev.slug,
          email: org.email || prev.email,
          phone: org.phone || prev.phone,
          address: org.address?.street || prev.address,
          city: org.address?.city || prev.city,
          state: org.address?.state || prev.state,
          pincode: org.address?.postalCode || prev.pincode,
          gstNumber: org.taxNumber || org.gstNumber || prev.gstNumber,
          country: countryName,
          countryCode: matched?.cca2 || 'IN',
          currency: org.settings?.currency || matched?.currencyCode || prev.currency,
          currencySymbol: matched?.currencySymbol || prev.currencySymbol,
          timezone: org.settings?.timezone || matched?.primaryTimezone || prev.timezone,
          dateFormat: org.settings?.dateFormat || prev.dateFormat,
          subscription: org.subscription || prev.subscription,
        }));
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Country selection change
  const handleCountryChange = (cca2: string) => {
    const matched = countries.find((c) => c.cca2 === cca2);
    if (matched) {
      setOrgForm((prev) => ({
        ...prev,
        country: matched.name,
        countryCode: matched.cca2,
        currency: matched.currencyCode,
        currencySymbol: matched.currencySymbol,
        timezone: matched.primaryTimezone,
      }));
    }
  };

  // Copy Workspace Slug
  const handleCopySlug = () => {
    if (!orgForm.slug) return;
    navigator.clipboard.writeText(orgForm.slug);
    setCopiedSlug(true);
    toast.success(tr("Workspace slug copied to clipboard!"));
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  // Save Organization Settings
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      toast.error(tr("Organization name is required"));
      return;
    }
    setSavingOrg(true);
    try {
      const res = await interiorApiClient.patch('/organizations/settings', {
        name: orgForm.name.trim(),
        country: orgForm.country,
        currency: orgForm.currency,
        timezone: orgForm.timezone,
        dateFormat: orgForm.dateFormat,
        email: orgForm.email,
        phone: orgForm.phone,
        address: {
          street: orgForm.address,
          city: orgForm.city,
          state: orgForm.state,
          postalCode: orgForm.pincode,
          country: orgForm.country,
        },
        taxNumber: orgForm.gstNumber,
      });

      const updated = res.data?.data || res.data;
      if (updated) {
        localStorage.setItem('interiorOrganization', JSON.stringify(updated));
        const rawUser = localStorage.getItem('interiorUser');
        if (rawUser) {
          try {
            const parsed = JSON.parse(rawUser);
            parsed.organization = updated;
            localStorage.setItem('interiorUser', JSON.stringify(parsed));
          } catch {}
        }
      }
      window.dispatchEvent(new Event('interior-org-updated'));
      toast.success(tr("Organization settings saved successfully"));
    } catch (error: any) {
      toast.error(error.response?.data?.message || tr("Failed to update organization settings"));
    } finally {
      setSavingOrg(false);
    }
  };

  // Save User Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) {
      toast.error(tr("User identifier not found"));
      return;
    }
    setSavingProfile(true);
    try {
      await interiorApiClient.patch(`/users/${userId}`, {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
        avatar,
      });

      const updatedUser = {
        ...currentUser,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
        avatar,
      };
      localStorage.setItem('interiorUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      toast.success(tr("Profile updated successfully"));
    } catch (error: any) {
      toast.error(error.response?.data?.message || tr("Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error(tr("Current password is required"));
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error(tr("New password must be at least 8 characters"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(tr("New passwords do not match"));
      return;
    }
    setSavingPwd(true);
    try {
      await interiorApiClient.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(tr("Password updated successfully"));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || tr("Failed to update password"));
    } finally {
      setSavingPwd(false);
    }
  };

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    const pwd = passwordForm.newPassword;
    if (!pwd) return { score: 0, label: 'Too short', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500', width: '25%' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500', width: '50%' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-blue-500', width: '75%' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-500', width: '100%' };
      default:
        return { score: 10, label: 'Too short', color: 'bg-slate-300', width: '10%' };
    }
  }, [passwordForm.newPassword]);

  const roleName = currentUser?.role?.name || (currentUser?.systemRole === 'org_admin' ? 'Administrator' : currentUser?.systemRole) || 'Member';

  const navItems = ([
    { id: 'general', label: 'Company Profile', icon: Building2 },
    { id: 'profile', label: 'Personal Account', icon: User },
    { id: 'localization', label: 'Currency & Regional', icon: Globe2 },
    { id: 'security', label: 'Security & Access', icon: Lock },
  ] as { id: SettingsTab; label: string; icon: React.ElementType; badge?: string }[]).filter(
    (item) => canReadSettings || (item.id !== 'general' && item.id !== 'localization')
  );

  // User Initials
  const userInitials = useMemo(() => {
    const f = profileForm.firstName || currentUser?.firstName || '';
    const l = profileForm.lastName || currentUser?.lastName || '';
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || 'U';
  }, [profileForm, currentUser]);

  // Loading skeleton matching other pages
  if (loading) {
    return (
      <div className="interior-os-theme min-h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-[100rem] mx-auto overflow-x-hidden font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 animate-pulse">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 rounded-lg" />
            <div className="h-4 w-96 bg-slate-100 rounded-md" />
          </div>
          <div className="h-8 w-36 bg-slate-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-18 bg-white border border-slate-200 rounded-xl p-3 animate-pulse" />
          ))}
        </div>
        <div className="h-9 w-96 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse p-6" />
      </div>
    );
  }

  return (
    <div className="interior-os-theme min-h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-[100rem] mx-auto overflow-x-hidden font-sans">
      
      {/* ── 1. Page Header & Live Status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {tr("Settings & Preferences")}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {orgForm.name || tr("Workspace")}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {tr("Manage organization details, currency localization, security credentials, and workspace preferences.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {tr("Live Sync Active")}
          </span>
        </div>
      </div>

      {/* ── 2. Top Metric / Status Cards (Matching Projects, Vendors, Users & Roles) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Company Profile */}
        <button
          type="button"
          onClick={() => canReadSettings && setActiveTab('general')}
          disabled={!canReadSettings}
          className={cn(
            'bg-white border rounded-xl p-3 text-start transition-all duration-150 flex items-center gap-3 group cursor-pointer',
            activeTab === 'general'
              ? 'border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,1)] bg-blue-50/20'
              : 'border-slate-200 shadow-2xs hover:border-slate-300'
          )}
        >
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            activeTab === 'general' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
          )}>
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider block leading-tight">{tr("Company")}</span>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5" title={orgForm.name}>
              {orgForm.name || tr("Workspace")}
            </div>
            <span className="text-[0.6875rem] text-slate-400 font-mono truncate block">
              {orgForm.slug || tr("workspace")}
            </span>
          </div>
        </button>

        {/* Card 2: Personal Account */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            'bg-white border rounded-xl p-3 text-start transition-all duration-150 flex items-center gap-3 group cursor-pointer',
            activeTab === 'profile'
              ? 'border-indigo-600 shadow-[0_0_0_1px_rgba(79,70,229,1)] bg-indigo-50/20'
              : 'border-slate-200 shadow-2xs hover:border-slate-300'
          )}
        >
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
          )}>
            <User className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider block leading-tight">{tr("Account")}</span>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {profileForm.firstName ? `${profileForm.firstName} ${profileForm.lastName || ''}`.trim() : tr("User Profile")}
            </div>
            <span className="text-[0.6875rem] text-slate-400 capitalize truncate block">
              {tr(roleName)}
            </span>
          </div>
        </button>

        {/* Card 3: Localization & Region */}
        <button
          type="button"
          onClick={() => canReadSettings && setActiveTab('localization')}
          disabled={!canReadSettings}
          className={cn(
            'bg-white border rounded-xl p-3 text-start transition-all duration-150 flex items-center gap-3 group cursor-pointer',
            activeTab === 'localization'
              ? 'border-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,1)] bg-emerald-50/20'
              : 'border-slate-200 shadow-2xs hover:border-slate-300'
          )}
        >
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            activeTab === 'localization' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
          )}>
            <Globe2 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider block leading-tight">{tr("Currency & Region")}</span>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {tr(orgForm.currency)} ({tr(orgForm.currencySymbol)})
            </div>
            <span className="text-[0.6875rem] text-slate-400 truncate block">
              {tr(orgForm.country)}
            </span>
          </div>
        </button>

        {/* Card 4: Security & Access */}
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={cn(
            'bg-white border rounded-xl p-3 text-start transition-all duration-150 flex items-center gap-3 group cursor-pointer',
            activeTab === 'security'
              ? 'border-purple-600 shadow-[0_0_0_1px_rgba(147,51,234,1)] bg-purple-50/20'
              : 'border-slate-200 shadow-2xs hover:border-slate-300'
          )}
        >
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            activeTab === 'security' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 group-hover:bg-purple-100'
          )}>
            <Lock className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider block leading-tight">{tr("Security")}</span>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {tr("Password & Auth")}
            </div>
            <span className="text-[0.6875rem] text-emerald-600 font-semibold truncate block">
              {tr("Active Protection")}
            </span>
          </div>
        </button>
      </div>

      {/* ── 3. Quick Segment Filter Tabs (Matching Audit Management / Users & Roles) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center gap-2',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tr(item.label)}</span>
              {item.badge && (
                <span
                  className={cn(
                    'text-[0.625rem] px-1.5 py-0.2 rounded font-bold uppercase',
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {tr(item.badge)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 4. Main Settings Content Card (Full Width Corporate Layout) ── */}
      <div className="w-full">
        {/* TAB 1: Company Profile */}
        {activeTab === 'general' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{tr("Company Information")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tr("Your organization details appear on project invoices, purchase orders, and client quotation headers.")}
              </p>
            </div>

            <form onSubmit={handleSaveOrganization} className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Organization Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {tr("Organization Legal Name *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    placeholder={tr("e.g. Acme Interior Design & Fitout")}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>

                {/* Workspace Slug */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      {tr("Workspace Identifier")}
                    </label>
                    <button
                      type="button"
                      onClick={handleCopySlug}
                      className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSlug ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSlug ? tr("Copied") : tr("Copy")}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={orgForm.slug || 'workspace'}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 font-mono text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Company Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("Official Contact Email")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="email"
                      value={orgForm.email}
                      onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                      placeholder={tr("info@company.com")}
                      className="w-full ps-8 pe-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Company Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("Official Contact Phone")}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={orgForm.phone}
                      onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full ps-8 pe-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Address Street */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{tr("Street / Office Address")}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                    placeholder={tr("Floor 4, Skyline Towers, Business Bay")}
                    className="w-full ps-8 pe-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("City")}</label>
                  <input
                    type="text"
                    value={orgForm.city}
                    onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })}
                    placeholder={tr("e.g. Pune")}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("State / Region")}</label>
                  <input
                    type="text"
                    value={orgForm.state}
                    onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })}
                    placeholder={tr("e.g. Maharashtra")}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>

                {/* Postal Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("Postal / Pin Code")}</label>
                  <input
                    type="text"
                    value={orgForm.pincode}
                    onChange={(e) => setOrgForm({ ...orgForm, pincode: e.target.value })}
                    placeholder="411001"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Tax / GSTIN */}
              <div className="space-y-1.5 max-w-sm">
                <label className="text-xs font-semibold text-slate-700">{tr("Tax Registration / GSTIN")}</label>
                <input
                  type="text"
                  value={orgForm.gstNumber}
                  onChange={(e) => setOrgForm({ ...orgForm, gstNumber: e.target.value })}
                  placeholder={tr("27AAAAA0000A1Z5")}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {!canUpdateSettings && (
                  <p className="text-xs text-amber-600 font-medium">{tr("Read-only view. Organization admin or settings update permission required to modify.")}</p>
                )}
                <button
                  type="submit"
                  disabled={savingOrg || !canUpdateSettings}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer ms-auto active:scale-[0.98]"
                >
                  {savingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingOrg ? tr("Saving...") : tr("Save Organization Details")}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Personal Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden mb-5">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{tr("Language")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{tr("Choose the language for the app. Arabic switches the layout to right-to-left.")}</p>
            </div>
            <div className="p-5 sm:p-6">
              <LanguageSelector />
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{tr("Personal Information")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tr("Manage your personal profile identity, phone number, and account credentials.")}
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 sm:p-6 space-y-6">
              {/* Profile Card Header with Blue Initials Avatar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-600 to-blue-500 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-2xs">
                    {tr(userInitials)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {profileForm.firstName ? `${profileForm.firstName} ${profileForm.lastName || ''}`.trim() : tr("Account User")}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentUser?.email || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {tr("Verified Email")}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                    {tr(roleName)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("First Name *")}</label>
                  <input
                    type="text"
                    required
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("Last Name *")}</label>
                  <input
                    type="text"
                    required
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-w-md">
                <label className="text-xs font-semibold text-slate-700">{tr("Contact Number")}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full ps-8 pe-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingProfile ? tr("Saving...") : tr("Save Profile Changes")}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Localization & Currency */}
        {activeTab === 'localization' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{tr("Currency & Regional Standards")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tr("Selecting your country automatically configures default project currencies, symbols, and timezone.")}
              </p>
            </div>

            <form onSubmit={handleSaveOrganization} className="p-5 sm:p-6 space-y-6">
              {/* Currency Live Preview Card */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                    {tr(orgForm.currencySymbol)}
                  </div>
                  <div>
                    <p className="text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider">{tr("Standard Display Currency")}</p>
                    <p className="text-base font-bold text-slate-900">
                      {tr(orgForm.currency)} ({tr(orgForm.currencySymbol)})
                    </p>
                  </div>
                </div>

                <div className="sm:text-end">
                  <p className="text-[0.6875rem] text-slate-500 uppercase tracking-wider">{tr("BOQ / Quote Format Preview")}</p>
                  <p className="text-sm font-mono font-bold text-blue-700">
                    {tr(orgForm.currencySymbol)} 1,250,000.00
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {tr("Country / Jurisdiction")}
                  </label>
                  <select
                    value={orgForm.countryCode}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer"
                  >
                    {countries.map((c) => (
                      <option key={c.cca2} value={c.cca2}>
                        {tr(c.flag)} {tr(c.name)} ({tr(c.currencyCode)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {tr("Date Format")}
                  </label>
                  <select
                    value={orgForm.dateFormat}
                    onChange={(e) => setOrgForm({ ...orgForm, dateFormat: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="DD/MM/YYYY">{tr("DD/MM/YYYY (e.g. 12/10/2026)")}</option>
                    <option value="MM/DD/YYYY">{tr("MM/DD/YYYY (e.g. 10/12/2026)")}</option>
                    <option value="YYYY-MM-DD">{tr("YYYY-MM-DD (ISO standard)")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("Primary Timezone")}</label>
                  <input
                    type="text"
                    disabled
                    value={orgForm.timezone}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{tr("Currency Symbol")}</label>
                  <input
                    type="text"
                    disabled
                    value={orgForm.currencySymbol}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {!canUpdateSettings && (
                  <p className="text-xs text-amber-600 font-medium">{tr("Read-only view. Organization admin or settings update permission required to modify.")}</p>
                )}
                <button
                  type="submit"
                  disabled={savingOrg || !canUpdateSettings}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer ms-auto active:scale-[0.98]"
                >
                  {savingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingOrg ? tr("Saving...") : tr("Apply Regional Settings")}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: Security & Access */}
        {activeTab === 'security' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{tr("Password & Authentication")}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tr("Ensure your account is protected with a secure password containing symbols and mixed casing.")}
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 sm:p-6 space-y-5 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{tr("Current Password *")}</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2 pe-10 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{tr("New Password *")}</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder={tr("At least 8 characters")}
                    className="w-full px-3.5 py-2 pe-10 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {passwordForm.newPassword && (
                  <div className="space-y-1 pt-1.5">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[0.6875rem] text-slate-500">
                      <span>{tr("Strength: ")}<strong className="text-slate-800">{tr(passwordStrength.label)}</strong></span>
                      <span>{tr("Use uppercase, numbers & special characters")}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{tr("Confirm New Password *")}</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingPwd}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  {savingPwd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  <span>{savingPwd ? tr("Updating...") : tr("Update Password")}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

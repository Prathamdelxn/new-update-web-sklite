'use client';

// =============================================================================
// Sky-Lite Web — InteriorOS Modern Enterprise Settings & Workspace
// Pure Light Theme Edition — Clean, crisp Linear/Stripe-grade master-detail
// settings interface with dynamic organization, account, currency, security,
// and notification controls.
// =============================================================================

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
} from 'lucide-react';
import { InteriorShell } from '@/components/interior/InteriorShell';
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
  // Company profile and regional settings are org-wide → admins only (PATCH /organizations/settings)
  const { isOrgAdmin } = usePermissions();
  const activeTab: SettingsTab =
    !isOrgAdmin && (selectedTab === 'general' || selectedTab === 'localization') ? 'profile' : selectedTab;
  const [loading, setLoading] = useState(true);

  // User State
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

  // Save Organization Settings
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      toast.error('Organization name is required');
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
      toast.success('Organization settings saved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update organization settings');
    } finally {
      setSavingOrg(false);
    }
  };

  // Save User Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = currentUser?._id || currentUser?.id;
    if (!userId) {
      toast.error('User identifier not found');
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
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPwd(true);
    try {
      await interiorApiClient.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update password');
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
  ] as { id: SettingsTab; label: string; icon: React.ElementType; badge?: string }[]).filter((item) => isOrgAdmin || (item.id !== 'general' && item.id !== 'localization'));

  return (
    <InteriorShell>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Settings & Preferences
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {orgForm.name || 'Workspace'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Manage organization details, currency localization, security credentials, and workspace preferences.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Enabled
              </span>
            </div>
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column Navigation */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3 space-y-4">
              <nav className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all text-left cursor-pointer',
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-4 h-4', isSelected ? 'text-white' : 'text-slate-500')} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider',
                            isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Workspace Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                    {orgForm.name ? orgForm.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {orgForm.name || 'Workspace'}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {roleName}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Currency:</span>
                    <span className="font-semibold text-slate-800">{orgForm.currency} ({orgForm.currencySymbol})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Timezone:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[120px]">{orgForm.timezone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column Content */}
            <div className="col-span-12 md:col-span-8 lg:col-span-9 space-y-6">
              {/* TAB 1: Company Profile */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900">Company Information</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your organization details appear on project invoices, purchase orders, and client quotation headers.
                      </p>
                    </div>

                    <form onSubmit={handleSaveOrganization} className="p-6 space-y-5">
                      {/* Organization Name Input */}
                      <div className="space-y-1.5 max-w-lg">
                        <label className="text-xs font-semibold text-slate-700">
                          Organization Legal Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={orgForm.name}
                          onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                          placeholder="e.g. Acme Interior Design & Fitout"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <p className="text-[11px] text-slate-500">
                          Workspace ID: <span className="font-mono text-slate-700 font-semibold">{orgForm.slug || 'workspace'}</span>
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={savingOrg}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {savingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {savingOrg ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: Personal Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage your profile identity and contact number.
                      </p>
                    </div>

                    <form onSubmit={handleSaveProfile} className="p-6 space-y-6">

                      {/* User identity & email badge */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>Account Email:</span>
                          <strong className="text-slate-800">{currentUser?.email || 'N/A'}</strong>
                        </div>
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">First Name *</label>
                          <input
                            type="text"
                            required
                            value={profileForm.firstName}
                            onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">Last Name *</label>
                          <input
                            type="text"
                            required
                            value={profileForm.lastName}
                            onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 max-w-md">
                        <label className="text-xs font-semibold text-slate-700">Contact Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: Localization & Currency */}
              {activeTab === 'localization' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900">Currency & Regional Standards</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Selecting your country automatically configures default project currencies, symbols, and timezone.
                      </p>
                    </div>

                    <form onSubmit={handleSaveOrganization} className="p-6 space-y-6">
                      {/* Currency Live Preview Card */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                            {orgForm.currencySymbol}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500">Standard Display Currency</p>
                            <p className="text-base font-bold text-slate-900">
                              {orgForm.currency} ({orgForm.currencySymbol})
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">BOQ Sample Representation</p>
                          <p className="text-sm font-mono font-bold text-blue-700">
                            {orgForm.currencySymbol} 1,250,000.00
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            Country / Jurisdiction
                          </label>
                          <select
                            value={orgForm.countryCode}
                            onChange={(e) => handleCountryChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                          >
                            {countries.map((c) => (
                              <option key={c.cca2} value={c.cca2}>
                                {c.flag} {c.name} ({c.currencyCode})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            Date Format
                          </label>
                          <select
                            value={orgForm.dateFormat}
                            onChange={(e) => setOrgForm({ ...orgForm, dateFormat: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                          >
                            <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 12/10/2026)</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/12/2026)</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={savingOrg}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {savingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {savingOrg ? 'Saving...' : 'Apply Regional Settings'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: Security & Access */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900">Password & Authentication</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ensure your account is protected with a secure password containing symbols and mixed casing.
                      </p>
                    </div>

                    <form onSubmit={handleChangePassword} className="p-6 space-y-5 max-w-xl">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Current Password *</label>
                        <div className="relative">
                          <input
                            type={showCurrentPwd ? 'text' : 'password'}
                            required
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder="••••••••••••"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 pr-10 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">New Password *</label>
                        <div className="relative">
                          <input
                            type={showNewPwd ? 'text' : 'password'}
                            required
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="At least 8 characters"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 pr-10 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPwd(!showNewPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Strength: <strong className="text-slate-800">{passwordStrength.label}</strong></span>
                              <span>Use uppercase, numbers & special characters</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Confirm New Password *</label>
                        <input
                          type="password"
                          required
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="••••••••••••"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={savingPwd}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                          {savingPwd ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      </div>
    </InteriorShell>
  );
}

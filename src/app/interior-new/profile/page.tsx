'use client';

import React, { useState, useEffect } from 'react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { getInteriorUser } from '@/lib/interiorAuth';
import { useToast } from '@/providers/ToastContext';
import interiorApiClient from '@/services/interiorApi.client';
import { CloudinaryUpload } from '@/components/shared/CloudinaryUpload';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import {
  User,
  Mail,
  Shield,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function InteriorProfilePage() {
  const checked = useInteriorAuthGuard();
  const [user, setUser] = useState<any>(null);
  const toast = useToast();

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [avatar, setAvatar] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (checked) {
      const u = getInteriorUser();
      setUser(u);
      if (u) {
        setProfileForm({ firstName: u.firstName || '', lastName: u.lastName || '', phone: u.phoneNumber || '' });
        setAvatar(u.avatar || '');
      }
    }
  }, [checked]);

  if (!checked) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await interiorApiClient.patch(`/users/${user.id}`, { 
        firstName: profileForm.firstName, 
        lastName: profileForm.lastName, 
        phoneNumber: profileForm.phone,
        avatar
      });
      
      const updatedUser = { ...user, firstName: profileForm.firstName, lastName: profileForm.lastName, phoneNumber: profileForm.phone, avatar };
      localStorage.setItem('interiorUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSavingPwd(true);
    try {
      await interiorApiClient.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <InteriorShell>
      <div className="max-w-3xl mx-auto space-y-8 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal information and account security.</p>
        </div>

        {/* Profile Card */}
        <GlassCard className="p-8 border-gray-200" gradient>
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-2.5 rounded-xl bg-blue-100 border border-blue-200">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
              <p className="text-xs text-slate-500">Update your name, phone and avatar.</p>
            </div>
          </div>

          {/* Avatar */}
          <div className="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
            <div className="relative shrink-0">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-extrabold border-2 border-blue-200">
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1">Profile Photo</p>
              <p className="text-xs text-slate-500 mb-3">Upload a new avatar. Recommended: 200×200px, max 5MB.</p>
              <CloudinaryUpload
                onUpload={(url) => setAvatar(url)}
                accept="image/*"
                maxSizeMB={5}
                currentUrl={avatar}
              />
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>First Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.firstName}
                  onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Last Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.lastName}
                  onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl py-2.5 px-4 text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </GlassCard>

        {/* Password Card */}
        <GlassCard className="p-8 border-gray-200" gradient>
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
              <p className="text-xs text-slate-500">Use a strong password with at least 8 characters.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            {[
              { label: 'Current Password', field: 'currentPassword' as const },
              { label: 'New Password', field: 'newPassword' as const },
              { label: 'Confirm New Password', field: 'confirmPassword' as const },
            ].map(({ label, field }) => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium text-slate-600 ml-1">{label}</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={passwordForm[field]}
                    onChange={e => setPasswordForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 pr-12 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                    placeholder="••••••••"
                  />
                  {field === 'confirmPassword' && passwordForm.newPassword && passwordForm.confirmPassword && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      {passwordForm.newPassword === passwordForm.confirmPassword
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <span className="text-red-400 text-xs font-bold">✗</span>}
                    </div>
                  )}
                  {field === 'newPassword' && (
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-gray-700 transition-colors"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPwd}
                className="flex items-center space-x-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Change Password</span>
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </InteriorShell>
  );
}

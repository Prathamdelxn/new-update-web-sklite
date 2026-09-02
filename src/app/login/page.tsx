'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building, Eye, EyeOff, Lock, Mail, Loader2, ArrowLeft, CheckCircle2, HardHat, Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { loginInterior } from '@/lib/interiorAuth';
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industryType, setIndustryType] = useState<'construction' | 'interior'>('construction');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpSent, setFpSent] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpLoading(true);
    try {
      if (industryType === 'interior') {
        await interiorApiClient.post('/auth/forgot-password', { email: fpEmail });
      } else {
        await api.post('/auth/forgot-password', { email: fpEmail });
      }
      setFpSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (industryType === 'interior') {
        await loginInterior(email, password);
        toast.success('Welcome back!');
        router.push('/interior-new');
      } else {
        await login({ email, password, industryType });
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Invalid credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen xl:h-screen xl:overflow-hidden bg-[#E6F0FF] flex items-center justify-center p-4 sm:p-6 xl:p-0">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6 xl:gap-8 w-full max-w-md xl:max-w-5xl">
        
        {/* Left Marketing Banner - Hidden on mobile, shown on desktop (xl+) */}
        <div className="hidden xl:flex order-2 xl:order-1 rounded-3xl bg-[#0E3B7B] p-6 xl:p-8 text-white overflow-hidden relative flex-col justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_35%)] pointer-events-none" />
          <div className="relative z-10 flex h-full flex-col justify-between space-y-6">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                <Building className="w-5 h-5 text-white" />
                SkyStruct Lite
              </div>

              <h1 className="mt-4 xl:mt-6 text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight">
                Build better projects
                <span className="text-[#8AC7FF]"> with one login</span>
              </h1>

              <p className="mt-3 xl:mt-4 max-w-xl text-blue-100/90 text-xs xl:text-sm leading-normal">
                Access your workspace, manage teams, projects, and budgets seamlessly from one place.
              </p>
            </div>

            <div className="mt-4 xl:mt-6 rounded-2xl border border-white/10 bg-white/10 p-5 xl:p-6 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-100/80">Platform Features</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">✓</div>
                  <p className="text-xs xl:text-sm text-blue-100/90">Unified login for Workspace Members & Super Admins</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">✓</div>
                  <p className="text-xs xl:text-sm text-blue-100/90">Real-time project tracking, BOQs & budget management</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid size-6 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold text-white">✓</div>
                  <p className="text-xs xl:text-sm text-blue-100/90">Seamless sync across Web & Expo Mobile app</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Card - Visible everywhere */}
        <div className="order-1 xl:order-2 rounded-3xl bg-white p-5 sm:p-7 xl:p-8 border border-slate-200/80 flex flex-col justify-between w-full">
          <div>
            {/* Mobile Brand Logo Header */}
            <div className="xl:hidden flex items-center justify-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-[#0E3B7B] flex items-center justify-center text-white">
                <Building className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#0E3B7B]">SkyStruct Lite</span>
            </div>

            <div className="mb-4 sm:mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Sign in</h2>
                <p className="mt-0.5 text-xs text-slate-500">Enter your credentials to continue.</p>
              </div>
              <div className="rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 shrink-0">Account Access</div>
            </div>

            {registered && (
              <div className="mb-3 xl:mb-4 rounded-2xl border border-emerald-100/90 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                Registration successful! Please login with your credentials.
              </div>
            )}

            <div className="space-y-4">
              <div className="mb-4 sm:mb-5">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Select Workspace Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIndustryType('construction')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                      industryType === 'construction'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <HardHat className="w-4 h-4" />
                    Construction
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndustryType('interior')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                      industryType === 'interior'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    Interior
                  </button>
                </div>
              </div>

              {showForgotPw ? (
                <div>
                  <button
                    onClick={() => { setShowForgotPw(false); setFpSent(false); setFpEmail(''); }}
                    className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>

                  {fpSent ? (
                    <div className="text-center py-4 sm:py-6">
                      <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl sm:rounded-3xl bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-900">OTP Sent</h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-500">A reset email has been sent to <span className="font-medium text-slate-900">{fpEmail}</span>.</p>
                      <Link
                        href={`/reset-password?email=${encodeURIComponent(fpEmail)}&type=${industryType}`}
                        className="mt-5 sm:mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-500 active:scale-95"
                      >
                        Enter OTP & Reset Password
                      </Link>
                      <button
                        onClick={() => setFpSent(false)}
                        className="mt-3 sm:mt-4 text-xs font-semibold text-slate-500 hover:text-slate-900"
                      >
                        Resend Email
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-0.5">Reset Password</h3>
                      <p className="text-xs text-slate-500 mb-3 sm:mb-4">Enter your email and we’ll send a reset link.</p>
                      <form onSubmit={handleForgotPassword} className="space-y-3.5 sm:space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-700">Email Address</label>
                          <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              type="email"
                              required
                              value={fpEmail}
                              onChange={(e) => setFpEmail(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              placeholder="name@company.com"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={fpLoading}
                          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
                        >
                          {fpLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Email Address</label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="name@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Password</label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        Remember me
                      </label>
                      <button type="button" onClick={() => setShowForgotPw(true)} className="font-semibold text-blue-600 hover:text-blue-700">
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-xl bg-blue-600 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95 cursor-pointer"
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </form>

                  <div className="mt-4 text-center text-xs text-slate-500">
                    Don’t have an account?{' '}
                    <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                      Register Workspace
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 sm:mt-6 text-center text-[11px] sm:text-xs text-slate-400">
            © 2026 SkyStruct Lite. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

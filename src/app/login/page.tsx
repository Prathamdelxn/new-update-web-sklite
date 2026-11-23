'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { loginInterior } from '@/lib/interiorAuth';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [industryType, setIndustryType] = useState<'construction' | 'interior'>('construction');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpSent, setFpSent] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  // Load remembered email on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('rememberedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  const openForgotPassword = () => {
    setShowForgotPw(true);
    setFpSent(false);
    if (email) {
      setFpEmail(email.trim());
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPw(false);
    setFpSent(false);
    setFpEmail('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFpEmail = fpEmail.trim().toLowerCase();
    if (!cleanFpEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setFpLoading(true);
    try {
      if (industryType === 'interior') {
        await interiorApiClient.post('/auth/forgot-password', { email: cleanFpEmail });
      } else {
        await api.post('/auth/forgot-password', { email: cleanFpEmail });
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

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error('Invalid email address');
      return;
    }

    // Persist or remove remembered email
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', cleanEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
    }

    setIsLoading(true);

    try {
      if (industryType === 'interior') {
        await loginInterior(cleanEmail, password);
        toast.success('Welcome back!');
        router.push('/interior-new');
      } else {
        await login({ email: cleanEmail, password, industryType });
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
    <div className="min-h-screen bg-[#E6F0FF] flex items-center justify-center p-4 sm:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 w-full max-w-md xl:max-w-4xl">
        
        {/* Left visual panel – imagery only (desktop) */}
        <AuthVisualPanel industryType={industryType} className="hidden xl:flex order-2 xl:order-1" />

        {/* Right Sign In Card - Visible everywhere */}
        <div className="order-1 xl:order-2 rounded-3xl bg-white p-5 sm:p-6 border border-slate-200/80 flex flex-col justify-between w-full shadow-sm">
          <div>
            {/* Logo only on small screens – on desktop it sits on the photo panel */}
            <div className="xl:hidden mb-4">
              <img src="/SS-Logo-2025-Colour.svg" alt="SkyStruct" className="h-11 w-auto" />
            </div>

            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-0.5 text-xs text-slate-500">Enter your credentials to continue.</p>
              </div>
            </div>

            {registered && (
              <div className="mb-3 xl:mb-4 rounded-2xl border border-emerald-100/90 bg-emerald-50 p-2.5 text-xs text-emerald-800">
                Your workspace is ready. Enter your details to continue.
              </div>
            )}

            <div className="space-y-3">
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setIndustryType('construction')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                      industryType === 'construction'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Construction
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setIndustryType('interior')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                      industryType === 'interior'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Interior
                  </button>
                </div>
              </div>

              {showForgotPw ? (
                <div>
                  <button
                    type="button"
                    disabled={fpLoading}
                    onClick={closeForgotPassword}
                    className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-60"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
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
                        type="button"
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
                          <label htmlFor="fp-email" className="text-xs font-semibold text-slate-700">Email Address</label>
                          <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              id="fp-email"
                              type="email"
                              required
                              disabled={fpLoading}
                              autoComplete="email"
                              value={fpEmail}
                              onChange={(e) => setFpEmail(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                              placeholder="name@company.com"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={fpLoading}
                          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
                        >
                          {fpLoading ? (
                            <span className="inline-flex items-center justify-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Sending Link...
                            </span>
                          ) : (
                            'Send Reset Link'
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                    <div>
                      <label htmlFor="login-email" className="text-xs font-semibold text-slate-700">Email Address</label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          disabled={isLoading}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                          placeholder="name@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">Password</label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          disabled={isLoading}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 p-1 disabled:opacity-40"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                      <label htmlFor="remember-me" className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          id="remember-me"
                          type="checkbox"
                          disabled={isLoading}
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                        />
                        Remember Me
                      </label>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={openForgotPassword}
                        className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95 cursor-pointer"
                    >
                      {isLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Signing In...
                        </span>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>

                  <div className="mt-4 text-center text-xs text-slate-500">
                    Don’t have an account?{' '}
                    <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                      Create a workspace
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 text-center text-[11px] text-slate-400">
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

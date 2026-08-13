'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, User, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { signupInterior, verifyInteriorEmail } from '@/lib/interiorAuth';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';

export default function RegisterPage() {
  const [industryType, setIndustryType] = useState<'construction' | 'interior'>('construction');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Interior-only fields (mirrors interior-os-frontend's signup form)
  const [organizationName, setOrganizationName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { register, login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const isInterior = industryType === 'interior';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isInterior) {
      if (!organizationName || !firstName || !lastName || !email || !password) {
        return toast.error('Please fill in all required fields');
      }
      const strongEnough = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
      if (!strongEnough) {
        return toast.error('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number');
      }
      setIsLoading(true);
      try {
        await signupInterior({ organizationName, firstName, lastName, email, password });
        toast.success('Registration code sent to your email!');
        setShowOtp(true);
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
        toast.error(message || 'Registration failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!name || !email || !password || !confirmPassword) return toast.error('Please fill in all required fields');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setIsLoading(true);
    try {
      await register({ name, email, password, phoneNumber, industryType });
      toast.success('Registration code sent to your email!');
      setShowOtp(true);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'Registration failed. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otp || otp.length !== 6) return toast.error('Please enter a valid 6-digit OTP');
    setIsVerifying(true);

    if (isInterior) {
      try {
        await verifyInteriorEmail(email, otp);
        toast.success('Workspace verified and created successfully!');
        router.push('/interior-new');
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
        toast.error(message || 'Verification failed. Please check the OTP.');
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    try {
      await api.post('/auth/register/verify', { email, otp });
      toast.success('Workspace verified and created successfully!');
      // Auto-login after verification (matching mobile app logic)
      await login({ email, password });
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'Verification failed. Please check the OTP.');
    } finally { setIsVerifying(false); }
  };

  const handleResend = async () => {
    setResendLoading(true);

    if (isInterior) {
      try {
        await signupInterior({ organizationName, firstName, lastName, email, password });
        toast.success('A new OTP has been sent to your email.');
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
        toast.error(message || 'Failed to resend OTP.');
      } finally {
        setResendLoading(false);
      }
      return;
    }

    try {
      await api.post('/auth/register', { name, email, password, phoneNumber });
      toast.success('A new OTP has been sent to your email.');
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'Failed to resend OTP.');
    } finally { setResendLoading(false); }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#E6F0FF] flex items-center justify-center px-4 sm:px-6 py-6 lg:py-0">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-[1.2fr_1fr]">
        <aside className="order-2 lg:order-1 relative overflow-hidden rounded-3xl bg-[#0E3B7B] p-6 lg:p-8 text-white shadow-xl flex flex-col justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_35%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between space-y-6">
            <div>
              <Link href="/" className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold shadow-sm"><Building2 className="size-4" /> Sky-Lite Construction</Link>
              <h1 className="mt-4 lg:mt-6 text-3xl font-extrabold leading-tight tracking-tight">Set up your team&apos;s<br /><span className="text-[#8AC7FF]">project command centre.</span></h1>
              <p className="mt-3 lg:mt-4 max-w-xl text-sm leading-normal text-blue-100/90">Create a workspace where every project, approval, and decision stays connected from day one.</p>
            </div>
            <div className="mt-4 lg:mt-6 rounded-2xl border border-white/10 bg-white/10 p-4 lg:p-5 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-100/80">What happens next</p>
              <div className="mt-4 space-y-3">{[
                ['1', 'Create your workspace', 'Add your organisation details and primary account.'],
                ['2', 'Verify your email', 'Confirm your account securely with a one-time code.'],
                ['3', 'Invite your team', 'Bring the right people into your first project.'],
              ].map(([number, title, detail]) => <div key={number} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#0E3B7B]">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-blue-100/75">{detail}</p></div></div>)}</div>
            </div>
          </div>
        </aside>

        <section className="order-1 lg:order-2 rounded-3xl border border-slate-200/80 bg-white p-5 lg:p-6 shadow-xl shadow-slate-200/60 flex flex-col justify-between">
          {showOtp ? <div>
            <button onClick={() => setShowOtp(false)} className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900"><ArrowLeft className="size-4" /> Back to registration</button>
            <div className="text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><KeyRound className="size-5" /></div><h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">Verify your workspace</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-normal text-slate-500">We sent a 6-digit code to <span className="font-semibold text-slate-900">{email}</span>. Enter it below to complete setup.</p></div>
            <form onSubmit={handleVerify} className="mt-6 space-y-4"><div><label className="text-xs font-semibold text-slate-700">Verification code</label><div className="relative mt-1"><KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="text" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} className={`${inputClass} pr-10 text-center font-mono text-base tracking-[0.45em]`} placeholder="000000" /></div></div><button type="submit" disabled={isVerifying || otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{isVerifying && <Loader2 className="size-4 animate-spin" />}{isVerifying ? 'Verifying...' : 'Verify workspace'}</button></form>
            <p className="mt-4 text-center text-xs text-slate-500">Didn&apos;t receive a code? <button type="button" onClick={handleResend} disabled={resendLoading} className="font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50">{resendLoading ? 'Resending...' : 'Resend code'}</button></p>
          </div> : <>
            <div className="mb-4"><p className="text-[10px] lg:text-xs font-bold tracking-wider text-blue-600">CREATE YOUR WORKSPACE</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Get started with SKYLITE</h2><p className="mt-1 text-xs leading-normal text-slate-500">Set up your account now. Invite teammates and create your first project straight after.</p></div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Select Industry Type</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIndustryType('construction')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition ${
                      industryType === 'construction'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>🏗️</span> Construction
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndustryType('interior')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-semibold transition ${
                      industryType === 'interior'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>🎨</span> Interior Design
                  </button>
                </div>
              </div>
              {isInterior ? (
                <>
                  <div><label className="text-xs font-semibold text-slate-700">Company / Organization</label><div className="relative mt-1"><Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="text" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className={inputClass} placeholder="Acme Interior Solutions" required /></div></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="text-xs font-semibold text-slate-700">First name</label><div className="relative mt-1"><User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} placeholder="John" required /></div></div>
                    <div><label className="text-xs font-semibold text-slate-700">Last name</label><div className="relative mt-1"><input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} className={`${inputClass} pl-3`} placeholder="Doe" required /></div></div>
                  </div>
                  <div><label className="text-xs font-semibold text-slate-700">Work email</label><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="john@acme.com" required /></div></div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Min. 8 characters" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">Must include an uppercase letter, a lowercase letter, and a number.</p>
                  </div>
                </>
              ) : (
                <>
                  <div><label className="text-xs font-semibold text-slate-700">Full name</label><div className="relative mt-1"><User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="John Doe" required /></div></div>
                  <div><label className="text-xs font-semibold text-slate-700">Work email</label><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="name@company.com" required /></div></div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Mobile number</label>
                    <div className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 outline-none transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        value={phoneNumber}
                        onChange={(value) => setPhoneNumber(value || '')}
                        placeholder="Enter mobile number"
                        style={{ display: 'flex', alignItems: 'center' }}
                      />
                      <style jsx global>{`
                        .PhoneInputInput {
                          border: none;
                          background: transparent;
                          outline: none;
                          font-size: 0.75rem;
                          width: 100%;
                          margin-left: 8px;
                        }
                        .PhoneInputCountry {
                          margin-right: 8px;
                        }
                      `}</style>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="text-xs font-semibold text-slate-700">Password</label><div className="relative mt-1"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Password" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
                    <div><label className="text-xs font-semibold text-slate-700">Confirm password</label><div className="relative mt-1"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} placeholder="Confirm password" required /></div></div>
                  </div>
                </>
              )}
              <button type="submit" disabled={isLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{isLoading && <Loader2 className="size-4 animate-spin" />}{isLoading ? 'Creating workspace...' : 'Create workspace'}</button>
            </form>
            <div className="mt-3 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">Already have a workspace? <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link></div>
          </>}
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400"><CheckCircle2 className="size-3.5" /> Secure account setup for your organisation</div>
        </section>
      </div>
    </div>
  );
}

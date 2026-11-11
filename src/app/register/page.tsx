'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, User, Phone, Globe, DollarSign, HardHat, Palette } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { signupInterior, verifyInteriorEmail } from '@/lib/interiorAuth';
import { CountryCodeSelect } from '@/components/ui/CountryCodeSelect';
import { fetchGlobalCountries, getLocalCountries, CountryInfo } from '@/services/country.service';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';

export default function RegisterPage() {
  const [industryType, setIndustryType] = useState<'construction' | 'interior'>('construction');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Organization and user details
  const [organizationName, setOrganizationName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [interiorPhone, setInteriorPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Country & Currency Selection derived from Country Code
  const [countries, setCountries] = useState<CountryInfo[]>(() => getLocalCountries());
  const [selectedCountryCode, setSelectedCountryCode] = useState('IN');
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Kolkata');

  const { register, login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    // Load fresh countries from API if online
    fetchGlobalCountries().then((list) => {
      if (list && list.length > 0) setCountries(list);
    });
  }, []);

  const currentCountry = useMemo(() => {
    return countries.find((c) => c.cca2 === selectedCountryCode) || countries.find((c) => c.cca2 === 'IN') || countries[0];
  }, [countries, selectedCountryCode]);

  const handleCountryChange = (cca2: string) => {
    setSelectedCountryCode(cca2);
    const country = countries.find((c) => c.cca2 === cca2);
    if (country) {
      setSelectedCurrency(country.currencyCode);
      setSelectedTimezone(country.primaryTimezone);
    }
  };

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
      const fullPhone = interiorPhone.trim() ? `${currentCountry?.phoneCode || '+91'} ${interiorPhone.trim()}` : '';

      try {
        await signupInterior({
          organizationName,
          firstName,
          lastName,
          email,
          password,
          phone: fullPhone,
          country: currentCountry?.name || 'India',
          currency: selectedCurrency || currentCountry?.currencyCode || 'INR',
          timezone: selectedTimezone || currentCountry?.primaryTimezone || 'Asia/Kolkata',
        });
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

    if (!organizationName.trim() || !name || !email || !password || !confirmPassword) return toast.error('Please fill in all required fields');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) return toast.error('Invalid email address');
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) return toast.error('Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one special symbol');
    setIsLoading(true);
    try {
      await register({ name, email, password, phoneNumber, industryType, organizationName: organizationName.trim() });
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
      await api.post('/auth/register', { name, email, password, phoneNumber, industryType, organizationName: organizationName.trim() });
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
        <aside className="order-2 lg:order-1 relative overflow-hidden rounded-3xl bg-[#0A2952] p-6 lg:p-8 text-white shadow-xl flex flex-col justify-between">
          {/* Construction Background Image with Brand Gradient Overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src="/construction-bg.jpg"
              alt="SkyStruct Construction"
              className="h-full w-full object-cover object-center"
            />
            {/* Rich gradient & blue tint overlay to guarantee contrast & text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#061d3d] via-[#092b57]/80 to-[#0e3b7b]/75 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E3B7B]/70 via-transparent to-[#071c36]/90" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_40%)]" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between space-y-6">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold shadow-sm">
                <img
                  src="/SS-Emblem.svg"
                  alt="SkyStruct Logo"
                  className="w-5 h-5 object-contain brightness-0 invert"
                />
                SkyStruct Lite
              </Link>
              <h1 className="mt-4 lg:mt-6 text-3xl font-extrabold leading-tight tracking-tight">A unified workspace for your<br /><span className="text-[#8AC7FF]">entire project lifecycle.</span></h1>
              <p className="mt-3 lg:mt-4 max-w-xl text-sm leading-normal text-blue-100/90">Keep drawings, BOQs, site execution, and stakeholders aligned from day one.</p>
            </div>
            <div className="mt-4 lg:mt-6 rounded-2xl border border-white/10 bg-white/10 p-4 lg:p-5 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-100/80">What happens next</p>
              <div className="mt-4 space-y-3">{[
                ['1', 'Create your workspace', 'Add your organization details and primary account.'],
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
            <div className="mb-4 sm:mb-5">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Create Workspace</h2>
              <p className="mt-0.5 text-xs text-slate-500">Enter your details to get started.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Select Your SignUp Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIndustryType('construction')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-semibold transition active:scale-95 ${
                      industryType === 'construction'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <HardHat className="w-4 h-4" />
                    Construction
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndustryType('interior')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-semibold transition active:scale-95 ${
                      industryType === 'interior'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    Interior
                  </button>
                </div>
              </div>
              {isInterior ? (
                <>
                  <div><label className="text-xs font-semibold text-slate-700">Organization Name</label><div className="relative mt-1"><Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="text" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className={inputClass} placeholder="Acme Interior Solutions" required /></div></div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="text-xs font-semibold text-slate-700">First Name</label><div className="relative mt-1"><User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} placeholder="John" required /></div></div>
                    <div><label className="text-xs font-semibold text-slate-700">Last Name</label><div className="relative mt-1"><input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} className={`${inputClass} pl-3`} placeholder="Doe" required /></div></div>
                  </div>

                  <div><label className="text-xs font-semibold text-slate-700">Email Address</label><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="john@acme.com" required /></div></div>

                  {/* Contact Number with Country Code & Auto-Currency Mapping */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">Contact Number</label>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Currency: {currentCountry?.currencySymbol} {selectedCurrency}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-2">
                      {/* Country Code Picker with Instant Search */}
                      <CountryCodeSelect
                        countries={countries}
                        value={selectedCountryCode}
                        onChange={handleCountryChange}
                        className="w-28 shrink-0"
                      />

                      {/* Phone Input */}
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={interiorPhone}
                          onChange={(e) => setInteriorPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                          className={`${inputClass} pl-8.5`}
                          placeholder="555 019 2834"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Min. 8 characters" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Organization Name</label>
                    <div className="relative mt-1">
                      <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(event) => setOrganizationName(event.target.value)}
                        className={inputClass}
                        placeholder="Acme Construction"
                        required
                      />
                    </div>
                  </div>
                  <div><label className="text-xs font-semibold text-slate-700">Full Name</label><div className="relative mt-1"><User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="John Doe" required /></div></div>
                  <div><label className="text-xs font-semibold text-slate-700">Email Address</label><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="name@company.com" required /></div></div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
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
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Password</label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="Min. 8 characters" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                      </div>
                    </div>
                    <div><label className="text-xs font-semibold text-slate-700">Confirm Password</label><div className="relative mt-1"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} placeholder="Confirm password" required /></div></div>
                  </div>
                </>
              )}
              <button type="submit" disabled={isLoading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95">{isLoading && <Loader2 className="size-4 animate-spin" />}{isLoading ? 'Creating Workspace...' : 'Create Workspace'}</button>
            </form>
            <div className="mt-4 text-center text-xs text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">Sign In</Link></div>
          </>}
        </section>
      </div>
    </div>
  );
}

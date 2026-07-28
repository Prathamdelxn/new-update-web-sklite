'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
} from 'lucide-react';

import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';

export default function TermsPage() {
  const router = useRouter();

  return (
    <Shell>
      <div className="max-w-4xl mx-auto p-8 space-y-8">

        {/* Header */}

        <div className="flex items-center gap-4">

          <button
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full border border-gray-200 hover:bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <h1 className="text-3xl font-bold">
            Terms & Conditions
          </h1>

        </div>

        {/* Hero Card */}

        <GlassCard className="rounded-2xl border border-slate-200 p-14 text-center">

          <div className="mx-auto w-24 h-8 rounded-3xl bg-blue-50 flex items-center justify-center mb-8">

            <FileText className="w-12 h-12 text-blue-600" />

          </div>

          <h2 className="text-5xl font-extrabold text-slate-900">

            Legal Agreement

          </h2>

          <p className="text-lg text-slate-500 mt-4">

            Last updated: October 2026

          </p>

        </GlassCard>

        {/* Content */}

        <GlassCard className="rounded-3xl border border-slate-200 p-10">

          <div className="prose prose-slate max-w-none">

            <p className="text-md leading-8 text-slate-600">
              Please read these terms and conditions carefully before using
              our application. By continuing to use the application, you
              agree to these terms.
            </p>

            <section className="mt-10">
              <h3 className="text-2xl font-bold mb-4">
                1. Acceptance of Terms
              </h3>

              <p className="text-md leading-8 text-slate-600">
                By accessing and using this application, you agree to be
                bound by these Terms and Conditions. Continued use of the
                platform constitutes acceptance of any future updates to
                these terms.
              </p>
            </section>

            <section className="mt-10">
              <h3 className="text-2xl font-bold mb-4">
                2. Privacy Policy
              </h3>

              <p className="text-md leading-8 text-slate-600">
                Your privacy is important to us. Information collected
                through the platform is handled according to our Privacy
                Policy and applicable data protection regulations.
              </p>
            </section>

            <section className="mt-10">
              <h3 className="text-2xl font-bold mb-4">
                3. User Conduct
              </h3>

              <p className="text-md leading-8 text-slate-600">
                Users agree to use this platform responsibly and lawfully.
                Activities that interfere with system operation, violate
                regulations, or infringe on the rights of others are strictly
                prohibited.
              </p>
            </section>

            <section className="mt-10">
              <h3 className="text-2xl font-bold mb-4">
                4. Intellectual Property
              </h3>

              <p className="text-md leading-8 text-slate-600">
                All software, content, branding, designs, documentation,
                and intellectual property associated with this application
                remain the exclusive property of the company and may not be
                copied or redistributed without written permission.
              </p>
            </section>

            <section className="mt-10">
              <h3 className="text-2xl font-bold mb-4">
                5. Limitation of Liability
              </h3>

              <p className="text-md leading-8 text-slate-600">
                Under no circumstances shall the company be liable for any
                indirect, incidental, special, or consequential damages
                resulting from the use or inability to use this platform.
              </p>
            </section>

          </div>

        </GlassCard>

        <p className="text-center text-slate-500 text-md">

          If you have any questions regarding these Terms & Conditions,
          please contact the support team.

        </p>

      </div>
    </Shell>
  );
}
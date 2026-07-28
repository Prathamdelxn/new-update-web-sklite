'use client';

import { Shell } from '@/components/layouts/Shell';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';

import CurrentPlanCard from '@/components/settings/CurrentPlanCard';
import UsageCard from '@/components/settings/UsageCard';
import FeatureList from '@/components/settings/FeatureList';
import PlanCard from '@/components/settings/PlanCard';
import PlanHistory from '@/components/settings/PlanHistory';

export default function PlanBillingPage() {
  const router = useRouter();

  return (
    <Shell>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}

        <div className="flex items-center justify-between mb-8">

          <div className="flex items-center gap-4">

            <button
              onClick={() => router.back()}
              className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Plan & Billing
              </h1>

              <p className="text-slate-500">
                Manage your subscription and billing.
              </p>
            </div>

          </div>

          <button className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
            <Bell className="w-5 h-5" />
          </button>

        </div>

        {/* Current Plan */}

        <CurrentPlanCard />

        {/* Usage + Features */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

          <UsageCard />

          <FeatureList />

        </div>

        {/* Plans */}

        <div className="mt-10">

          <h2 className="uppercase tracking-[4px] text-blue-600 text-sm font-bold mb-6">
            Choose a Plan
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <PlanCard
              title="Silver"
              color="bg-gradient-to-r from-slate-500 to-slate-700"
              current
              features={[
                'Up to 10 projects',
                'Up to 10 team members',
                'Milestones & Tasks',
                'Materials tracking',
                'Issues & Risks',
                'Custom roles',
              ]}
            />

            <PlanCard
              title="Gold"
              color="bg-gradient-to-r from-amber-500 to-orange-600"
              features={[
                'Up to 50 projects',
                'Up to 100 team members',
                'Milestones & Tasks',
                'Materials tracking',
                'Issues & Risks',
                'BOQ Import (XLS/XER)',
              ]}
            />

            <PlanCard
              title="Platinum"
              color="bg-gradient-to-r from-blue-600 to-indigo-700"
              features={[
                'Unlimited projects',
                'Unlimited team members',
                'Milestones & Tasks',
                'Materials tracking',
                'Issues & Risks',
                'BOQ Import (XLS/XER)',
              ]}
            />

          </div>

        </div>

        {/* History */}

        <div className="mt-10">

          <PlanHistory />

        </div>

      </div>
    </Shell>
  );
}
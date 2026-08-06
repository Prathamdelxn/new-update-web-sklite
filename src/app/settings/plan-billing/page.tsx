'use client';

import { Shell } from '@/components/layouts/Shell';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/services/api.client';

import CurrentPlanCard from '@/components/settings/CurrentPlanCard';
import UsageCard from '@/components/settings/UsageCard';
import FeatureList from '@/components/settings/FeatureList';
import PlanCard from '@/components/settings/PlanCard';
import PlanHistory from '@/components/settings/PlanHistory';

const PLAN_CONFIG: Record<string, { color: string; features: string[] }> = {
  Silver: {
    color: 'bg-gradient-to-r from-slate-500 to-slate-700',
    features: [
      'Up to 10 projects',
      'Up to 10 team members',
      'Milestones & Tasks',
      'Materials tracking',
      'Issues & Risks',
      'Custom roles',
    ],
  },
  Gold: {
    color: 'bg-gradient-to-r from-amber-500 to-orange-600',
    features: [
      'Up to 50 projects',
      'Up to 100 team members',
      'Milestones & Tasks',
      'Materials tracking',
      'Issues & Risks',
      'BOQ Import (XLS/XER)',
    ],
  },
  Platinum: {
    color: 'bg-gradient-to-r from-blue-600 to-indigo-700',
    features: [
      'Unlimited projects',
      'Unlimited team members',
      'Milestones & Tasks',
      'Materials tracking',
      'Issues & Risks',
      'BOQ Import (XLS/XER)',
    ],
  },
};

interface SubscriptionData {
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
    renewalDate: string | null;
    limits: { maxProjects: number | null; maxUsers: number | null; features: string[] };
    history: any[];
  } | null;
  usage: { users: number; projects: number };
}

export default function PlanBillingPage() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/organization/subscription');
        setData(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentPlan = data?.subscription?.plan || 'Silver';

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

        {loading ? (
          <div className="text-slate-400">Loading subscription…</div>
        ) : (
          <>
            {/* Current Plan */}

            <CurrentPlanCard
              plan={currentPlan}
              status={data?.subscription?.status || 'Trial'}
              trialEndsAt={data?.subscription?.trialEndsAt}
              renewalDate={data?.subscription?.renewalDate}
            />

            {/* Usage + Features */}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

              <UsageCard
                projects={data?.usage?.projects || 0}
                members={data?.usage?.users || 0}
                maxProjects={data?.subscription?.limits?.maxProjects ?? 10}
                maxUsers={data?.subscription?.limits?.maxUsers ?? 10}
              />

              <FeatureList features={data?.subscription?.limits?.features || []} />

            </div>

            {/* Plans */}

            <div className="mt-10">

              <h2 className="uppercase tracking-[4px] text-blue-600 text-sm font-bold mb-6">
                Choose a Plan
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {Object.entries(PLAN_CONFIG).map(([title, config]) => (
                  <PlanCard
                    key={title}
                    title={title}
                    color={config.color}
                    current={currentPlan === title}
                    features={config.features}
                  />
                ))}

              </div>

            </div>

            {/* History */}

            <div className="mt-10">

              <PlanHistory history={data?.subscription?.history || []} />

            </div>
          </>
        )}

      </div>
    </Shell>
  );
}

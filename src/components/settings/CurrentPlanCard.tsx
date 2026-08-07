'use client';

import { Star } from 'lucide-react';

const PLAN_COLOR: Record<string, string> = {
  Silver: 'from-slate-500 to-slate-700',
  Gold: 'from-amber-500 to-orange-600',
  Platinum: 'from-blue-600 to-indigo-700',
};

const STATUS_BADGE: Record<string, string> = {
  Trial: 'bg-purple-100 text-purple-700',
  Active: 'bg-green-100 text-green-700',
  Suspended: 'bg-red-100 text-red-700',
  Expired: 'bg-slate-200 text-slate-600',
};

interface CurrentPlanCardProps {
  plan: string;
  status: string;
  trialEndsAt?: string | null;
  renewalDate?: string | null;
}

export default function CurrentPlanCard({
  plan,
  status,
  trialEndsAt,
  renewalDate,
}: CurrentPlanCardProps) {
  const gradient = PLAN_COLOR[plan] || PLAN_COLOR.Silver;

  const dateLabel =
    status === 'Trial' && trialEndsAt
      ? `Trial ends ${new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : status === 'Active' && renewalDate
      ? `Renews ${new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : null;

  return (
    <div className={`rounded-3xl bg-gradient-to-r ${gradient} p-8 text-white shadow-lg`}>

      <div className="flex items-start justify-between">

        <div>

          <p className="uppercase tracking-[4px] text-xs font-semibold text-slate-200">
            Current Plan
          </p>

          <h2 className="text-5xl font-bold mt-4">
            {plan}
          </h2>

        </div>

        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">

          <Star className="w-8 h-8 fill-white text-white" />

        </div>

      </div>

      <div className="flex items-center gap-4 mt-10">

        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_BADGE[status] || STATUS_BADGE.Trial}`}>
          ● {status}
        </span>

        {dateLabel && (
          <span className="text-slate-200">
            {dateLabel}
          </span>
        )}

      </div>

    </div>
  );
}

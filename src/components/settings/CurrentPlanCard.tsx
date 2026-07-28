'use client';

import { Star } from 'lucide-react';

export default function CurrentPlanCard() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-slate-500 to-slate-700 p-8 text-white shadow-lg">

      <div className="flex items-start justify-between">

        <div>

          <p className="uppercase tracking-[4px] text-xs font-semibold text-slate-200">
            Current Plan
          </p>

          <h2 className="text-5xl font-bold mt-4">
            Silver
          </h2>

        </div>

        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">

          <Star className="w-8 h-8 fill-white text-white" />

        </div>

      </div>

      <div className="flex items-center gap-4 mt-10">

        <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold">
          ● Trial
        </span>

        <span className="text-slate-200">
          Trial ends Jul 2, 2026
        </span>

      </div>

    </div>
  );
}
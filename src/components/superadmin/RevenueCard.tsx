'use client';

import { Wallet } from 'lucide-react';

interface RevenueCardProps {
  amount: number | string;
}

export default function RevenueCard({
  amount,
}: RevenueCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-sm">

      <div className="flex justify-center">

        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">

          <Wallet className="w-8 h-8 text-green-600" />

        </div>

      </div>

      <div className="text-center mt-6">

        <p className="text-lg font-semibold text-slate-500">
          Estimated MRR
        </p>

        <h2 className="mt-3 text-6xl font-extrabold text-slate-900">
          ${amount}
        </h2>

        <p className="mt-3 text-slate-400 text-base">
          Based on active plans
        </p>

      </div>

    </div>
  );
}
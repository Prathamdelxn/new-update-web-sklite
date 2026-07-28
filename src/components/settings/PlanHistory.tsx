'use client';

export default function PlanHistory() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">

      <h3 className="text-xs tracking-[4px] uppercase font-bold text-blue-600 mb-6">
        Plan History
      </h3>

      <div className="flex gap-4">

        <div className="w-3 h-3 rounded-full bg-slate-500 mt-2"></div>

        <div>

          <h4 className="font-semibold">
            Silver — Trial
          </h4>

          <p className="text-slate-500 mt-1">
            Account registration
          </p>

          <p className="text-sm text-slate-400 mt-1">
            Jun 18, 2026
          </p>

        </div>

      </div>

    </div>
  );
}
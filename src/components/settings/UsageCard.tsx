'use client';

export default function UsageCard() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">

      <h3 className="text-xs tracking-[4px] uppercase text-blue-600 font-bold mb-8">
        Usage
      </h3>

      <div>

        <div className="flex justify-between mb-2">
          <span className="font-medium">Projects</span>
          <span className="text-slate-500">0 / 10</span>
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full w-0 bg-slate-500 rounded-full"></div>
        </div>

      </div>

      <div className="mt-8">

        <div className="flex justify-between mb-2">
          <span className="font-medium">Team Members</span>
          <span className="text-slate-500">1 / 10</span>
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full w-[10%] bg-slate-500 rounded-full"></div>
        </div>

      </div>

    </div>
  );
}
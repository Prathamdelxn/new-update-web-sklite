'use client';

interface StatCardProps {
  title: string;
  value: number | string;
}

export default function StatCard({
  title,
  value,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
      <h2 className="text-4xl font-bold text-slate-900">
        {value}
      </h2>

      <p className="mt-2 text-sm font-medium text-slate-500">
        {title}
      </p>
    </div>
  );
}
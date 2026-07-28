
'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RegistrationChartProps {
  data: {
    month: string;
    count: number;
  }[];
}


export default function RegistrationChart({
  data,
}: RegistrationChartProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-full">

      <div className="mb-6">

        <h2 className="text-xl font-bold text-slate-900">
          Organization Registrations
        </h2>

        <p className="text-slate-500 mt-1">
          Last 6 months
        </p>

      </div>

      <div className="h-80">

        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={data}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />

            <YAxis allowDecimals={false} />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="count"
              stroke="#4F46E5"
              strokeWidth={3}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}











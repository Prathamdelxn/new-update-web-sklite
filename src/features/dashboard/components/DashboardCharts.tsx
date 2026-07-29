'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

const REVENUE_DATA = [
  { month: 'Feb', revenue: 45000, projects: 2 },
  { month: 'Mar', revenue: 62000, projects: 3 },
  { month: 'Apr', revenue: 88000, projects: 4 },
  { month: 'May', revenue: 110000, projects: 5 },
  { month: 'Jun', revenue: 145000, projects: 6 },
  { month: 'Jul', revenue: 195000, projects: 7 },
];

const CATEGORY_DATA = [
  { name: 'Residential Villa', value: 42, color: '#2563EB' },
  { name: 'Penthouse Apartment', value: 28, color: '#4F46E5' },
  { name: 'Commercial Office', value: 20, color: '#0284C7' },
  { name: 'Hospitality & Retail', value: 10, color: '#059669' },
];

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Chart 1: Revenue & Project Growth (Area Chart) */}
      <div className="lg:col-span-8">
        <GlassCard className="p-5 bg-white border border-slate-200/80 rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Project Value & Revenue Trend</h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Monthly cumulative contract execution & revenue value ($)</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              Last 6 Months
            </span>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Chart 2: Project Category Breakdown (Donut/Pie Chart) */}
      <div className="lg:col-span-4">
        <GlassCard className="p-5 bg-white border border-slate-200/80 rounded-3xl space-y-4 shadow-xs h-full">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Project Type Distribution</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Active portfolio breakdown by property scope</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}%`, 'Share']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend List */}
          <div className="space-y-2 pt-1 text-xs">
            {CATEGORY_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

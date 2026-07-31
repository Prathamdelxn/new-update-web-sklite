import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
  onClick?: () => void;
}

export function DashboardCard({ title, value, subtitle, icon: Icon, trend, colorClass = "from-blue-500 to-indigo-600", onClick }: DashboardCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Background Gradient Blob for aesthetics */}
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 blur-2xl transition-opacity", colorClass)} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
        </div>
        <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-sm text-white", colorClass)}>
          <Icon size={20} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 relative z-10">
        {trend ? (
          <div className="flex items-center space-x-2">
            <span className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full",
              trend.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-slate-400">vs last month</span>
          </div>
        ) : subtitle ? (
          <span className="text-xs text-slate-500">{subtitle}</span>
        ) : (
          <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to view &rarr;</span>
        )}
      </div>
    </div>
  );
}

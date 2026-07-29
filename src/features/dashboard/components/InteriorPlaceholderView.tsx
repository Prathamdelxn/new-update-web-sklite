'use client';

import React from 'react';
import { LucideIcon, Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import Link from 'next/link';

interface InteriorPlaceholderViewProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const InteriorPlaceholderView: React.FC<InteriorPlaceholderViewProps> = ({
  title,
  description,
  icon: Icon,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white rounded-3xl p-6 md:p-8 shadow-lg shadow-blue-500/10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" /> Interior Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Icon className="w-7 h-7 text-blue-200" /> {title}
          </h1>
          <p className="text-xs md:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>
        <Link
          href="/interior/dashboard"
          className="mt-4 md:mt-0 inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-white border border-blue-200 px-4 py-2.5 rounded-2xl shadow-sm hover:bg-blue-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600" /> Back to Dashboard
        </Link>
      </div>

      {/* Main Content Placeholder */}
      <GlassCard className="p-8 md:p-12 text-center border border-blue-100 bg-white space-y-4" gradient>
        <div className="mx-auto w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
          <Icon className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-slate-900">{title} Module</h2>
          <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
            This module is being customized specifically for interior design workflows. Stay tuned for live updates.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
          <Clock className="w-4 h-4" /> Feature Under Active Development
        </div>
      </GlassCard>
    </div>
  );
};

'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  onClick?: () => void;
}

// One card style everywhere: plain white with a soft border. `gradient` is kept for old callers
// but no longer changes the look (the grey gradient made cards look inconsistent).
export const GlassCard: React.FC<GlassCardProps> = ({ children, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
};

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

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, gradient = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden',
        gradient && 'bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--muted))]',
        className
      )}
    >
      {children}
    </div>
  );
};

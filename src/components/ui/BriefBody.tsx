'use client';
import { tr } from '@/i18n';
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Body of a stage "Briefing" card (CRM lead page).
 * Collapsed: the stat tiles shrink to one inline line (see `.brief-compact` in globals.css)
 * and notes / instructions are hidden, so the stage's real content shows on the first screen.
 * Open: notes + the full stat tiles, as before.
 */
export function BriefBody({
  open,
  onToggle,
  stats,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  stats: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      {open && children}
      <div className={cn('flex gap-2', open ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between')}>
        <div className={cn('min-w-0 flex-1', !open && 'brief-compact')}>{stats}</div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="self-end sm:self-auto shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.6875rem] font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
        >
          {open ? tr('Hide details') : tr('Details')}
          <ChevronDown size={13} className={cn('transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </div>
    </>
  );
}

'use client';
import { tr } from '@/i18n';
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Toolbar above a list of AccordionCards: "Title (n)" + Expand all / Collapse all. */
export function AccordionToolbar({
  title,
  count,
  allOpen,
  onToggleAll,
}: {
  title: string;
  count: number;
  allOpen: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[hsl(var(--foreground))]">{title}</span>
        <span className="px-1.5 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))]">{count}</span>
      </div>
      {count > 1 && (
        <button
          type="button"
          onClick={onToggleAll}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[0.6875rem] font-semibold text-[hsl(var(--foreground))] transition-colors cursor-pointer"
        >
          <ChevronDown size={13} className={cn('transition-transform duration-200', allOpen && 'rotate-180')} />
          {allOpen ? tr('Collapse all') : tr('Expand all')}
        </button>
      )}
    </div>
  );
}

/**
 * Numbered card that collapses to a one-line header (number, icon, title, summary)
 * and slides open to show its content. Controlled: the parent owns `open`.
 */
export function AccordionCard({
  index,
  icon,
  title,
  summary,
  aside,
  open,
  onToggle,
  children,
}: {
  index: number;
  icon?: React.ReactNode;
  title: string;
  summary?: React.ReactNode;
  aside?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-[hsl(var(--card))] border rounded-xl overflow-hidden transition-all duration-200',
        open
          ? 'border-[hsl(var(--primary)/0.35)] shadow-sm ring-1 ring-[hsl(var(--primary)/0.08)]'
          : 'border-[hsl(var(--border))] shadow-2xs hover:border-[hsl(var(--primary)/0.25)]'
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'w-full text-start px-3.5 sm:px-4 py-3 flex items-center gap-3 cursor-pointer select-none transition-colors',
          open ? 'bg-[hsl(var(--primary)/0.04)]' : 'hover:bg-[hsl(var(--muted)/0.4)]'
        )}
      >
        <span
          className={cn(
            'w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors',
            open ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
          )}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] truncate">{title}</span>
          </span>
          {summary && (
            <span className="mt-0.5 block text-[0.6875rem] text-[hsl(var(--muted-foreground))] truncate">{summary}</span>
          )}
        </span>
        {aside && <span className="hidden sm:inline-flex shrink-0">{aside}</span>}
        <span
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
            open ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'
          )}
        >
          <ChevronDown size={16} className={cn('transition-transform duration-300', open && 'rotate-180')} />
        </span>
      </button>
      <div
        className={cn('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-3.5 sm:p-4 border-t border-[hsl(var(--border))]">{children}</div>
        </div>
      </div>
    </div>
  );
}

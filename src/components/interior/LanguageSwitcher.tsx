'use client';

// English / العربية switch (same two choices as the mobile app's language picker)
import React from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nProvider';
import { tr, Lang } from '@/i18n';

const OPTIONS: { value: Lang; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'ar', label: 'Arabic', native: 'العربية' },
];

/** Header button: one tap flips between English and Arabic. */
export function LanguageToggleButton({ className }: { className?: string }) {
  const { lang, setLanguage } = useI18n();
  const next: Lang = lang === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      title={tr('Change language')}
      aria-label={tr('Change language')}
      className={cn(
        'h-9 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-[hsl(var(--border))] text-sm font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors',
        className
      )}
    >
      <Globe className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      <span>{next === 'ar' ? 'العربية' : 'English'}</span>
    </button>
  );
}

/** Settings card: both options side by side. */
export function LanguageSelector() {
  const { lang, setLanguage } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 max-w-md">
      {OPTIONS.map((o) => {
        const active = lang === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setLanguage(o.value)}
            className={cn(
              'flex flex-col items-start gap-0.5 rounded-xl border p-3.5 text-start transition-colors',
              active
                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] ring-1 ring-[hsl(var(--primary))]'
                : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)]'
            )}
          >
            <span className="text-sm font-bold text-[hsl(var(--foreground))]">{o.native}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{tr(o.label)}</span>
          </button>
        );
      })}
    </div>
  );
}

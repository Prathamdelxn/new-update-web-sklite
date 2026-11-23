'use client';
import { tr } from '@/i18n';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Fixed-height scroll area for long lists (e.g. an activity timeline).
 * When the content overflows, a soft fade + a floating button appear:
 * "More" scrolls down one view; at the end it becomes "Top".
 */
export function ScrollPane({
  children,
  className,
  maxHeightClass = 'max-h-[30rem]',
}: {
  children: React.ReactNode;
  className?: string;
  maxHeightClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 4);
    setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  const onButton = () => {
    const el = ref.current;
    if (!el) return;
    if (atEnd) el.scrollTo({ top: 0, behavior: 'smooth' });
    else el.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        className={cn(maxHeightClass, 'overflow-y-auto overscroll-contain pe-1 [scrollbar-width:thin]', className)}
      >
        {/* room under the last item so the button never covers it */}
        <div className={overflows ? 'pb-11' : undefined}>{children}</div>
      </div>

      {overflows && (
        <>
          {!atEnd && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[hsl(var(--card))] to-transparent" />
          )}
          <button
            type="button"
            onClick={onButton}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md text-[0.6875rem] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
          >
            {atEnd ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {atEnd ? tr('Top') : tr('More')}
          </button>
        </>
      )}
    </div>
  );
}

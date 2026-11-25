'use client';
import { tr } from '@/i18n';

// Header bell: the signed-in user's in-app notifications (RFIs assigned to them, RFIs
// waiting for routing…). Polls every minute; the red badge shows the unread count.

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, MessageSquare, Inbox } from 'lucide-react';
import interiorApiClient from '@/services/interiorApi.client';
import { cn } from '@/lib/utils';

interface NotificationItem {
  _id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

const KEY = ['interior-notifications'];

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return tr('just now');
  if (s < 3600) return tr('{{n}}m ago', { n: Math.floor(s / 60) });
  if (s < 86400) return tr('{{n}}h ago', { n: Math.floor(s / 3600) });
  return tr('{{n}}d ago', { n: Math.floor(s / 86400) });
}

export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await interiorApiClient.get('/notifications', { params: { limit: 30 } });
      return (res.data?.data || { items: [], unreadCount: 0 }) as { items: NotificationItem[]; unreadCount: number };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const items = data?.items || [];
  const unread = data?.unreadCount || 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const markRead = async (body: { ids?: string[]; all?: boolean }) => {
    // optimistic: update the badge/list immediately
    qc.setQueryData(KEY, (old: any) =>
      old
        ? {
            items: old.items.map((n: NotificationItem) => (body.all || body.ids?.includes(n._id) ? { ...n, isRead: true } : n)),
            unreadCount: body.all ? 0 : Math.max(0, old.unreadCount - (body.ids || []).filter((id) => old.items.some((n: NotificationItem) => n._id === id && !n.isRead)).length),
          }
        : old
    );
    try {
      await interiorApiClient.patch('/notifications', body);
    } catch {
      qc.invalidateQueries({ queryKey: KEY });
    }
  };

  const openItem = (n: NotificationItem) => {
    if (!n.isRead) markRead({ ids: [n._id] });
    setOpen(false);
    if (n.actionUrl) router.push(n.actionUrl);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        aria-label={tr('Notifications')}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-[hsl(var(--destructive))] text-white text-[0.625rem] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))]">
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{tr('Notifications')}</span>
            {unread > 0 && (
              <button type="button" onClick={() => markRead({ all: true })} className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] hover:underline">
                <CheckCheck className="w-3.5 h-3.5" /> {tr('Mark all read')}
              </button>
            )}
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-[hsl(var(--muted-foreground))]">
                <Inbox className="w-6 h-6" />
                <span className="text-xs">{tr("You're all caught up")}</span>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={cn(
                    'w-full text-start flex gap-3 px-4 py-3 border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted)/0.5)]',
                    !n.isRead && 'bg-[hsl(var(--primary)/0.05)]'
                  )}
                >
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn('text-[0.8125rem] leading-snug text-[hsl(var(--foreground))]', !n.isRead ? 'font-semibold' : 'font-medium')}>{n.title}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] mt-1.5 shrink-0" />}
                    </span>
                    <span className="block text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">{n.body}</span>
                    <span className="block text-[0.6875rem] text-[hsl(var(--muted-foreground))] mt-1">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

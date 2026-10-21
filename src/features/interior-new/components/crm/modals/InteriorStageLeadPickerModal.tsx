'use client';

// =============================================================================
// Interior CRM — pick a lead to bring into a stage
// Leads normally reach a stage by being passed on from the previous tab. Users
// who can create in a stage but can't see the earlier tabs pick the lead here,
// then the stage's usual "send to" form opens for it.
// =============================================================================

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  leads: any[];
  onClose: () => void;
  onPick: (leadId: string) => void;
}

export function InteriorStageLeadPickerModal({ isOpen, title, leads, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.mobileNumber, l.email, l.city, l.status].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [leads, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">{title}</h3>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Choose the lead to bring into this stage</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-[hsl(var(--border))]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, city…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {shown.length === 0 ? (
            <p className="text-center text-xs text-[hsl(var(--muted-foreground))] py-10">
              {leads.length === 0 ? 'No leads are waiting to enter this stage.' : 'No leads match your search.'}
            </p>
          ) : (
            shown.map((lead) => (
              <button
                key={lead._id}
                onClick={() => { onPick(lead._id); onClose(); }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">{lead.name}</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                    {[lead.mobileNumber, lead.city].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    {lead.status}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

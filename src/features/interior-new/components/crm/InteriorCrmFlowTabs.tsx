'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Users,
  PhoneCall,
  MapPin,
  PenTool,
  Ruler,
  Calculator,
  FileText,
  XCircle,
} from 'lucide-react';

export type InteriorCrmStage =
  | 'leads'
  | 'follow_ups'
  | 'site_visits'
  | 'requirement_design'
  | 'drawing'
  | 'boq'
  | 'quotations'
  | 'won_projects'
  | 'lost_leads'
  | 'customers';

interface InteriorCrmFlowTabsProps {
  activeTab: InteriorCrmStage;
  onChange: (tab: InteriorCrmStage) => void;
  stageCounts?: Partial<Record<InteriorCrmStage, number>>;
}

const FLOW_STAGES: { id: InteriorCrmStage; label: string; icon: React.ElementType }[] = [
  { id: 'leads', label: 'All Leads', icon: Users },
  { id: 'follow_ups', label: 'Follow-ups', icon: PhoneCall },
  { id: 'site_visits', label: 'Site Visits', icon: MapPin },
  { id: 'requirement_design', label: 'Requirements', icon: PenTool },
  { id: 'drawing', label: 'Drawings', icon: Ruler },
  { id: 'boq', label: 'BOQ', icon: Calculator },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'lost_leads', label: 'Lost Leads', icon: XCircle },
];

export const InteriorCrmFlowTabs: React.FC<InteriorCrmFlowTabsProps> = ({
  activeTab,
  onChange,
  stageCounts = {},
}) => {
  return (
    <div className="w-full relative bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] overflow-x-auto scrollbar-none touch-pan-x">
      <div className="flex items-center w-full min-w-max px-2 py-1 sm:py-1.5 gap-1">
        {FLOW_STAGES.map((stage) => {
          const isActive = activeTab === stage.id;
          const Icon = stage.icon;
          const count = stageCounts[stage.id];

          return (
            <button
              key={stage.id}
              onClick={() => onChange(stage.id)}
              className={cn(
                'relative flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer shrink-0 active:scale-95',
                isActive
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.7)]'
              )}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2px] transition-colors',
                  isActive ? 'text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]'
                )}
              />

              <span className="whitespace-nowrap tracking-tight">{stage.label}</span>

              {typeof count === 'number' && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black leading-none transition-colors',
                    isActive
                      ? 'bg-white/20 text-[hsl(var(--primary-foreground))]'
                      : count > 0
                      ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                      : 'bg-transparent text-[hsl(var(--muted-foreground))]'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};


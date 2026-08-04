'use client';

// Port of src/components/crm/CrmFlowTabs.tsx — pure UI, no data-layer changes needed.

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Users,
  PhoneCall,
  MapPin,
  PenTool,
  FileText,
  XCircle,
  BarChart2,
} from 'lucide-react';

export type InteriorCrmStage =
  | 'leads'
  | 'follow_ups'
  | 'site_visits'
  | 'requirement_design'
  | 'quotations'
  | 'won_projects'
  | 'lost_leads'
  | 'customers'
  | 'reports';

interface InteriorCrmFlowTabsProps {
  activeTab: InteriorCrmStage;
  onChange: (tab: InteriorCrmStage) => void;
}

const FLOW_STAGES: { id: InteriorCrmStage; label: string; icon: React.ElementType }[] = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'follow_ups', label: 'Follow-ups', icon: PhoneCall },
  { id: 'site_visits', label: 'Site Visits', icon: MapPin },
  { id: 'requirement_design', label: 'Requirement & Design', icon: PenTool },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'lost_leads', label: 'Lost Leads', icon: XCircle },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
];

export const InteriorCrmFlowTabs: React.FC<InteriorCrmFlowTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="w-full relative bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] overflow-x-auto scrollbar-hide">
      <div className="flex items-center w-full min-w-max">
        {FLOW_STAGES.map((stage) => {
          const isActive = activeTab === stage.id;
          const Icon = stage.icon;

          return (
            <button
              key={stage.id}
              onClick={() => onChange(stage.id)}
              className={cn(
                'relative flex items-center justify-center flex-1 gap-1.5 px-4 py-3.5 text-sm font-bold transition-colors outline-none',
                isActive ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 stroke-[2.5px] transition-colors',
                  isActive ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'
                )}
              />

              <span className="tracking-wide whitespace-nowrap">{stage.label}</span>

              {isActive && (
                <motion.div
                  layoutId="interiorCrmFlowTabUnderline"
                  className="absolute left-0 right-0 bottom-0 h-[3px] bg-[hsl(var(--primary))] rounded-t-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

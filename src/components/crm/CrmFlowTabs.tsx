'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Users, 
  PhoneCall, 
  MapPin, 
  PenTool, 
  FileText, 
  Briefcase, 
  BadgeCheck, 
  Trophy, 
  XCircle, 
  UserCircle, 
  BarChart2
} from 'lucide-react';

export type CrmStage = 
  | 'leads' 
  | 'follow_ups' 
  | 'site_visits' 
  | 'requirement_design' 
  | 'quotations' 
  | 'won_projects'
  | 'lost_leads'
  | 'customers'
  | 'reports';

interface CrmFlowTabsProps {
  activeTab: CrmStage;
  onChange: (tab: CrmStage) => void;
}

const FLOW_STAGES: { id: CrmStage; label: string; icon: React.ElementType }[] = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'follow_ups', label: 'Follow-ups', icon: PhoneCall },
  { id: 'site_visits', label: 'Site Visits', icon: MapPin },
  { id: 'requirement_design', label: 'Requirement & Design', icon: PenTool },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'lost_leads', label: 'Lost Leads', icon: XCircle },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
];

export const CrmFlowTabs: React.FC<CrmFlowTabsProps> = ({ activeTab, onChange }) => {
  return (
    <div className="w-full relative bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide">
      <div className="flex items-center w-full min-w-max">
        {FLOW_STAGES.map((stage) => {
          const isActive = activeTab === stage.id;
          const Icon = stage.icon;

          return (
            <button
              key={stage.id}
              onClick={() => onChange(stage.id)}
              className={cn(
                "relative flex items-center justify-center flex-1 gap-1.5 px-4 py-3.5 text-sm font-bold transition-colors outline-none",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 stroke-[2.5px] transition-colors", 
                isActive ? "text-blue-600" : "text-slate-400"
              )} />
              
              <span className="tracking-wide whitespace-nowrap">{stage.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="crmFlowTabUnderline"
                  className="absolute left-0 right-0 bottom-0 h-[3px] bg-blue-600 rounded-t-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

'use client';

import { Check, X } from 'lucide-react';

const FEATURE_CATALOG = [
  { key: 'basic_boq', name: 'BOQ Management' },
  { key: 'milestones', name: 'Milestones & Tasks' },
  { key: 'materials', name: 'Materials tracking' },
  { key: 'issues', name: 'Issues & Risks' },
  { key: 'custom_roles', name: 'Custom roles' },
  { key: 'boq_import', name: 'BOQ Import (XLS/XER)' },
  { key: 'interior', name: 'Interior project type' },
  { key: 'export_reports', name: 'Export reports' },
  { key: 'arabic', name: 'Arabic / RTL interface' },
];

interface FeatureListProps {
  features: string[];
}

export default function FeatureList({ features }: FeatureListProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">

      <h3 className="text-xs font-bold tracking-[4px] uppercase text-blue-600 mb-6">
        What's Included
      </h3>

      <div className="space-y-5">

        {FEATURE_CATALOG.map((feature) => {
          const included = features.includes(feature.key);
          return (
            <div
              key={feature.key}
              className="flex items-center gap-4"
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  included
                    ? 'bg-green-100 text-green-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {included ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </div>

              <span
                className={`${
                  included
                    ? 'text-slate-800'
                    : 'text-slate-400 line-through'
                }`}
              >
                {feature.name}
              </span>
            </div>
          );
        })}

      </div>

    </div>
  );
}

'use client';

import { Check, X } from 'lucide-react';

const features = [
  { name: 'Up to 10 projects', included: true },
  { name: 'Up to 10 team members', included: true },
  { name: 'Milestones & Tasks', included: true },
  { name: 'Materials tracking', included: true },
  { name: 'Issues & Risks', included: true },
  { name: 'Custom roles', included: true },
  { name: 'BOQ Import (XLS/XER)', included: false },
  { name: 'Interior project type', included: false },
  { name: 'Export reports', included: false },
  { name: 'Arabic / RTL interface', included: false },
];

export default function FeatureList() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">

      <h3 className="text-xs font-bold tracking-[4px] uppercase text-blue-600 mb-6">
        What's Included
      </h3>

      <div className="space-y-5">

        {features.map((feature) => (
          <div
            key={feature.name}
            className="flex items-center gap-4"
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                feature.included
                  ? 'bg-green-100 text-green-600'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {feature.included ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </div>

            <span
              className={`${
                feature.included
                  ? 'text-slate-800'
                  : 'text-slate-400 line-through'
              }`}
            >
              {feature.name}
            </span>
          </div>
        ))}

      </div>

    </div>
  );
}
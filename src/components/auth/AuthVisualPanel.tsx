'use client';

// Left side of the Sign In / Register pages: imagery only, no marketing copy.
// The photo follows the Construction / Interior choice made in the form.

import React from 'react';
import { HardHat, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  industryType: 'construction' | 'interior';
  className?: string;
}

const SCENES = {
  construction: { src: '/construction-auth-bg.jpg', label: 'Construction', Icon: HardHat },
  interior: { src: '/interior-bg.jpg', label: 'Interior', Icon: Palette },
} as const;

export function AuthVisualPanel({ industryType, className }: Props) {
  return (
    <aside className={cn('relative overflow-hidden rounded-3xl bg-[#0A2952] shadow-xl', className)}>
      {/* Both photos stay mounted so switching is an instant crossfade */}
      {(Object.keys(SCENES) as Array<keyof typeof SCENES>).map((key) => (
        <img
          key={key}
          src={SCENES[key].src}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out',
            key === industryType ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}

      {/* Brand overlay: darkens the photo so the logo stands out (only place the logo appears on desktop) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#061d3d]/85 via-[#0a2952]/50 to-[#0a2952]/10" />

      <div className="relative z-10 flex h-full flex-col p-7">
        <img src="/SS-Logo-White.svg" alt="SkyStruct" className="h-20 w-auto self-start drop-shadow-lg" />
      </div>
    </aside>
  );
}

'use client';

import React from 'react';
import { Palette } from 'lucide-react';
import { Shell } from '@/components/layouts/Shell';
import { InteriorPlaceholderView } from '@/features/dashboard/components/InteriorPlaceholderView';

export default function InteriorFinishesPage() {
  return (
    <Shell>
      <InteriorPlaceholderView
        title="Finish Approvals & Material Samples"
        icon={Palette}
        description="Track client sign-offs on wood veneers, marble slabs, fabric swatches, paint finishes, and custom joinery samples."
      />
    </Shell>
  );
}

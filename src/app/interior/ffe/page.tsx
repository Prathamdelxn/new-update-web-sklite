'use client';

import React from 'react';
import { Box } from 'lucide-react';
import { Shell } from '@/components/layouts/Shell';
import { InteriorPlaceholderView } from '@/features/dashboard/components/InteriorPlaceholderView';

export default function InteriorFFEPage() {
  return (
    <Shell>
      <InteriorPlaceholderView
        title="FF&E Procurement & Tracking"
        icon={Box}
        description="Manage Furniture, Fixtures & Equipment procurement, supplier quotes, purchase orders, and delivery schedules."
      />
    </Shell>
  );
}

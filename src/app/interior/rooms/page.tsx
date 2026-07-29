'use client';

import React from 'react';
import { Home } from 'lucide-react';
import { Shell } from '@/components/layouts/Shell';
import { InteriorPlaceholderView } from '@/features/dashboard/components/InteriorPlaceholderView';

export default function InteriorRoomsPage() {
  return (
    <Shell>
      <InteriorPlaceholderView
        title="Room Moodboards & Space Planning"
        icon={Home}
        description="Organize design themes, color palettes, furniture arrangements, and 3D space layouts room by room."
      />
    </Shell>
  );
}

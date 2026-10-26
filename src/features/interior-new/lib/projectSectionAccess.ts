'use client';

// =============================================================================
// Interior — which View permission opens each project page
// Used by the project layout (blocks pages opened by link / URL) and by in-page
// shortcuts (e.g. the Handover readiness checklist). `org:` = org role (CRM /
// vendor data); the rest = project role (org role + role in this project).
// =============================================================================

import { useCallback } from 'react';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

export const SECTION_ACCESS: Record<string, string[]> = {
  '': ['projects'], // Overview
  sitedetails: ['projects'],
  filemgt: ['filemgt'],
  quotation: ['org:crm_quotations'],
  'confirm-order': ['confirm_order'],
  members: ['users'],
  drawings: ['drawings'],
  photos: ['photos'],
  rfis: ['rfis'],
  utilities: ['utilities'],
  wbs: ['wbs'],
  tasks: ['tasks'],
  milestones: ['milestones'],
  dpr: ['dpr'],
  'weekly-reports': ['weekly_reports'],
  mom: ['mom'],
  timeline: ['wbs', 'tasks'],
  boq: ['boq'],
  'variation-orders': ['variation_orders'],
  'change-requests': ['change_requests'],
  procurement: ['procurement', 'inventory'],
  'purchase-orders': ['procurement'],
  payments: ['financials'],
  snags: ['snags'],
  risks: ['risks'],
  handover: ['handover'],
  vendors: ['org:vendors'],
};

/** "/interior-new/projects/<id>/drawings/abc" → "drawings" ("" for the overview). */
export function sectionFromPath(path: string | null | undefined, projectId: string): string {
  const marker = `/projects/${projectId}`;
  const i = (path || '').indexOf(marker);
  if (i === -1) return '';
  return (path || '').slice(i + marker.length).split('/').filter(Boolean)[0] || '';
}

/** `canOpen(section)` → true / false, or null while permissions are loading. */
export function useCanOpenSection(projectId: string) {
  const { can, loading } = useProjectPermissions(projectId);
  const { hasPermission } = usePermissions();
  return useCallback(
    (section: string): boolean | null => {
      if (loading) return null;
      const keys = SECTION_ACCESS[section] ?? ['projects'];
      return keys.some((key) => (key.startsWith('org:') ? hasPermission(key.slice(4), 'read') : can(key, 'read')));
    },
    [loading, can, hasPermission]
  );
}

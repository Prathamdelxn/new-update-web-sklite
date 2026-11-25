'use client';

// Puts a page's title (and its main actions) into the interior top header bar, which was
// empty on every page — so the page body no longer spends ~90px on its own title block.
//
//   <InteriorPageHeader title="CRM Workspace" badge={…} actions={<Button…/>} />
//
// • Title (+ badge) → header (left), no description line, to keep the bar clean.  • Actions → header (right) from md up; on phones
//   they stay inline at the top of the page.  • Outside the interior shell (no header
//   slots) everything renders inline, so nothing is ever lost.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const HEADER_TITLE_SLOT = 'interior-header-title';
export const HEADER_ACTIONS_SLOT = 'interior-header-actions';

interface Props {
  title: React.ReactNode;
  /** Small pill next to the title (e.g. "Pipeline Live"). */
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  /** Shown before everything, on all screen sizes (e.g. a back button). */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}

export function InteriorPageHeader({ title, badge, icon, leading, actions }: Props) {
  const [slots, setSlots] = useState<{ title: HTMLElement | null; actions: HTMLElement | null } | null>(null);

  useEffect(() => {
    setSlots({
      title: document.getElementById(HEADER_TITLE_SLOT),
      actions: document.getElementById(HEADER_ACTIONS_SLOT),
    });
  }, []);

  const titleBlock = (
    <div className="min-w-0 flex items-center gap-2.5">
      {leading}
      {icon && (
        <span className="hidden sm:flex w-8 h-8 rounded-lg bg-blue-50 text-blue-600 items-center justify-center shrink-0">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg leading-tight font-bold tracking-tight text-slate-900 truncate">{title}</h1>
          {badge && <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0">{badge}</span>}
        </div>
      </div>
    </div>
  );

  // Not mounted yet → nothing (avoids a flash of the inline version on every page load)
  if (!slots) return actions ? <div className="md:hidden flex flex-col gap-2">{actions}</div> : null;

  // Outside the interior shell: inline fallback
  if (!slots.title) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {titleBlock}
        {actions && <div className="flex flex-col sm:flex-row gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <>
      {createPortal(titleBlock, slots.title)}
      {actions && slots.actions && createPortal(<div className="hidden md:flex items-center gap-2">{actions}</div>, slots.actions)}
      {actions && <div className="md:hidden flex flex-col gap-2">{actions}</div>}
    </>
  );
}

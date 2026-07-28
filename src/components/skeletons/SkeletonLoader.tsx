'use client';

import React from 'react';

/* ─── Primitive bone ───────────────────────────────────────────────── */
function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
      style={style}
    />
  );
}

/* ─── Preset layouts ───────────────────────────────────────────────── */

/** 3‑column card grid (projects page, etc.) */
function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
          </div>
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-5/6" />
          <div className="flex items-center justify-between pt-2">
            <Bone className="h-5 w-20 rounded-full" />
            <Bone className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dashboard with stat cards + chart area */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-16" />
            <Bone className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <Bone className="h-5 w-40" />
        <Bone className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Table rows */
function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 px-6 py-4 border-b border-gray-100 last:border-0">
          {Array.from({ length: cols }).map((_, ci) => (
            <Bone key={ci} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Generic list items */
function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
          <Bone className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-2/3" />
            <Bone className="h-3 w-1/3" />
          </div>
          <Bone className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Detail page (workspace, milestone) */
function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <Bone className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bone className="h-6 w-1/3" />
            <Bone className="h-3 w-1/2" />
          </div>
          <Bone className="h-8 w-24 rounded-xl" />
        </div>
        <div className="flex gap-3">
          <Bone className="h-5 w-20 rounded-full" />
          <Bone className="h-5 w-28 rounded-full" />
          <Bone className="h-5 w-24 rounded-full" />
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-9 w-24 rounded-xl" />
        ))}
      </div>
      {/* Content area */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <Bone className="h-5 w-40" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <Bone className="h-4 w-4/6" />
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Bone className="h-32 rounded-xl" />
          <Bone className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Modal skeleton */
function ModalSkeleton() {
  return (
    <div className="space-y-4 p-1">
      <Bone className="h-5 w-1/3" />
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Bone className="h-3 w-16" />
          <Bone className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Bone className="h-3 w-20" />
          <Bone className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Bone className="h-3 w-24" />
          <Bone className="h-20 w-full rounded-xl" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Bone className="h-10 flex-1 rounded-xl" />
        <Bone className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

/** Finance / form page */
function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <Bone className="h-3 w-20" />
            <Bone className="h-7 w-24" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={4} cols={4} />
    </div>
  );
}

/* ─── Preset map ──────────────────────────────────────────────────── */

const PRESETS: Record<string, React.ReactNode> = {
  'card-grid':  <CardGridSkeleton />,
  'dashboard':  <DashboardSkeleton />,
  'table':      <TableSkeleton />,
  'list':       <ListSkeleton />,
  'detail':     <DetailSkeleton />,
  'modal':      <ModalSkeleton />,
  'form':       <FormSkeleton />,
};

/* ─── Main wrapper ────────────────────────────────────────────────── */

interface SkeletonLoaderProps {
  /** Pass `true` while data is being fetched */
  loading: boolean;
  /** Preset name OR fully custom fallback via `fallback` */
  preset?: keyof typeof PRESETS | string;
  /** Custom fallback JSX (takes priority over preset) */
  fallback?: React.ReactNode;
  /** Children to render once loading is complete */
  children: React.ReactNode;
  /** Optional className on wrapper div */
  className?: string;
}

export function SkeletonLoader({
  loading,
  preset = 'list',
  fallback,
  children,
  className,
}: SkeletonLoaderProps) {
  if (loading) {
    return (
      <div className={className}>
        {fallback ?? PRESETS[preset] ?? <ListSkeleton />}
      </div>
    );
  }
  return <>{children}</>;
}

/* Re-export primitives for custom layouts */
export { Bone, CardGridSkeleton, DashboardSkeleton, TableSkeleton, ListSkeleton, DetailSkeleton, ModalSkeleton, FormSkeleton };

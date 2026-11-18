'use client';

// Loads three.js and the model loaders only when a 3D file is opened,
// instead of with every lead / shared-drawing page.
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { Interior3DViewerModal as Viewer } from './Interior3DViewerModal';

const LazyViewer = dynamic(
  () => import('./Interior3DViewerModal').then((mod) => mod.Interior3DViewerModal),
  { ssr: false }
);

export function Interior3DViewerModal(props: ComponentProps<typeof Viewer>) {
  if (!props.isOpen) return null;
  return <LazyViewer {...props} />;
}

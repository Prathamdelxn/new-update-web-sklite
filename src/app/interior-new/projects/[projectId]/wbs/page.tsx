'use client';

import { useParams } from 'next/navigation';
import InteriorWbsView from '@/features/interior-new/components/projects/InteriorWbsView';

export default function Page() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorWbsView projectId={projectId} />;
}

import { redirect } from 'next/navigation';

export default async function InteriorProjectRootPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  redirect(`/interior/projects/${resolvedParams.id}/details`);
}

import { redirect } from 'next/navigation';

export default async function ProjectRootPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  // Redirect the base project URL to the default 'details' tab
  redirect(`/projects/${resolvedParams.id}/details`);
}

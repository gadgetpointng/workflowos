import { redirect } from 'next/navigation';

export default async function StaffAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const params = new URLSearchParams();
  if (error) params.set('error', error);
  if (message) params.set('message', message);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  redirect(`/team${suffix}`);
}

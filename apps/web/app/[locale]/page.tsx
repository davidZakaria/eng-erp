import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  redirect(session ? `/${locale}/dashboard` : `/${locale}/login`);
}

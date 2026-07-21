import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { CONSULTANT_ROLES } from '@/lib/types';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const { role } = session.user;

  if (CONSULTANT_ROLES.includes(role)) {
    redirect('/dashboard/consultant');
  }

  if (role === 'HEAD_ENGINEER') {
    redirect('/dashboard/head-engineer');
  }

  if (role === 'PROJECT_MANAGER' || role === 'ADMIN') {
    redirect('/dashboard/head-engineer');
  }

  redirect('/dashboard/legacy');
}

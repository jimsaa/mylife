import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { hasAdminAccess } from '@/lib/auth/permissions';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    redirect('/login?redirect=/admin');
  }

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import { ProfileProvider } from '../../context/ProfileContext';
import { MobileHeader, MobileNav, Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <ProfileProvider>
      <div className="flex min-h-screen bg-surface-muted">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <MobileNav />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ProfileProvider>
  );
}

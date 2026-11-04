import { Outlet } from 'react-router-dom';
import { ProfileProvider } from '../../context/ProfileContext';
import { APP_BUILD_ID } from '../../lib/buildId';
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
          <footer className="sticky bottom-0 border-t border-border bg-surface px-4 py-2 text-right text-xs text-text-muted">
            Build {APP_BUILD_ID}
          </footer>
        </div>
      </div>
    </ProfileProvider>
  );
}

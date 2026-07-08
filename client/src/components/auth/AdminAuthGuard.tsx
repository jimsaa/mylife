import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authApi } from '../../api';
import { ADMIN_LOGIN } from '../../lib/constants';
import { useAdminRobotsMeta } from '../../lib/auth/useAdminRobotsMeta';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Temporary route guard — replace with Supabase Auth session check later.
 */
export function AdminAuthGuard() {
  useAdminRobotsMeta();
  const location = useLocation();
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    let active = true;

    authApi
      .session()
      .then((result) => {
        if (active) setState(result.authenticated ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (active) setState('unauthenticated');
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted text-text-muted">
        Loading…
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return <Navigate to={ADMIN_LOGIN} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

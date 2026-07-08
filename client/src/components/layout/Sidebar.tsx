import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useProfile } from '../../context/ProfileContext';
import { ADMIN_BASE, ADMIN_LOGIN, APP_NAME, NAV_ITEMS } from '../../lib/constants';
import { UserAvatar } from './UserAvatar';

const COLLAPSE_KEY = 'my-life-sidebar-collapsed';

export function Sidebar() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      navigate(ADMIN_LOGIN, { replace: true });
    }
  }

  return (
    <aside
      className={`hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 md:block ${
        collapsed ? 'w-[4.5rem]' : 'w-56'
      }`}
    >
      <div className="sticky top-0 flex h-screen flex-col">
        <div className={`border-b border-border ${collapsed ? 'px-2 py-4' : 'px-4 py-5'}`}>
          {!collapsed && (
            <>
              <p className="text-lg font-bold text-accent">{APP_NAME}</p>
              <p className="text-xs text-text-muted">Ditt liv, lokalt</p>
            </>
          )}
          {collapsed && (
            <p className="text-center text-xs font-bold text-accent" title={APP_NAME}>
              ML
            </p>
          )}

          <div className={`flex justify-center ${collapsed ? 'mt-3' : 'mt-4'}`}>
            <UserAvatar
              avatarUrl={profile?.avatar_url ?? null}
              size={collapsed ? 'sidebar-collapsed' : 'sidebar'}
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === ADMIN_BASE}
                  title={item.label}
                  className={({ isActive }) =>
                    `block rounded-lg text-sm transition ${
                      collapsed ? 'px-2 py-2 text-center' : 'px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-teal-50 font-medium text-accent'
                        : 'text-text-muted hover:bg-surface-muted hover:text-text'
                    }`
                  }
                >
                  {collapsed ? item.label.charAt(0) : item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-2 space-y-1">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg px-2 py-2 text-xs text-text-muted transition hover:bg-surface-muted hover:text-text"
          >
            {collapsed ? '⎋' : 'Logga ut'}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="w-full rounded-lg px-2 py-2 text-xs text-text-muted transition hover:bg-surface-muted hover:text-text"
            aria-label={collapsed ? 'Expandera sidopanel' : 'Minimera sidopanel'}
          >
            {collapsed ? '»' : '« Minimera'}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const { profile } = useProfile();

  return (
    <div className="border-b border-border bg-surface px-4 py-3 md:hidden">
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={profile?.avatar_url ?? null} size="mobile" />
        <div>
          <p className="text-base font-bold text-accent">{APP_NAME}</p>
          <p className="text-xs text-text-muted">Ditt liv, lokalt</p>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  return (
    <nav className="border-b border-border bg-surface px-2 py-2 md:hidden">
      <div className="flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === ADMIN_BASE}
            className={({ isActive }) =>
              `shrink-0 rounded-lg px-3 py-1.5 text-xs transition ${
                isActive ? 'bg-teal-50 font-medium text-accent' : 'text-text-muted'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

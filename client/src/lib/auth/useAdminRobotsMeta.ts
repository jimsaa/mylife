import { useEffect } from 'react';

const ROBOTS_META = 'my-life-admin-robots';

/** Client-side fallback for X-Robots-Tag on /admin pages (local dev + SPA). */
export function useAdminRobotsMeta() {
  useEffect(() => {
    let meta = document.querySelector(`meta[name="robots"][data-${ROBOTS_META}]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      meta.setAttribute(`data-${ROBOTS_META}`, 'true');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      meta?.remove();
    };
  }, []);
}

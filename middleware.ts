import { next } from '@vercel/functions';

export const config = {
  matcher: '/admin/:path*',
};

/** Adds noindex headers for all /admin pages (Vercel production). */
export default function middleware() {
  return next({
    headers: {
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

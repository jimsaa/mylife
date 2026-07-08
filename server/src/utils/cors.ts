import type { CorsOptions } from 'cors';

const PRIVATE_NETWORK_ORIGIN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d+)?$/;

/** Dev-only CORS: allow localhost and private LAN origins. Production uses default strictness. */
export function getCorsOptions(): CorsOptions | undefined {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }

  return {
    origin(origin, callback) {
      if (!origin || PRIVATE_NETWORK_ORIGIN.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
  };
}

declare const __APP_BUILD_ID__: string;

/** Short git SHA baked in at build time. On Vercel this is the deployed commit. */
export const APP_BUILD_ID = __APP_BUILD_ID__;

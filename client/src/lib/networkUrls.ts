const CLIENT_PORT = 3006;

export function getCurrentHostname(): string {
  return window.location.hostname;
}

export function getCurrentOrigin(): string {
  return window.location.origin;
}

export function buildLocalUrl(port = CLIENT_PORT): string {
  return `http://localhost:${port}`;
}

/** Best network URL when opened from a phone (hostname is already the LAN IP). */
export function getEffectiveNetworkUrl(port = CLIENT_PORT): string | null {
  const hostname = getCurrentHostname();
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }
  return `${window.location.protocol}//${hostname}:${port}`;
}

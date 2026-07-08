import os from 'node:os';

/** Non-internal IPv4 addresses on the local machine (Wi-Fi / Ethernet). */
export function getLanIPv4Addresses(): string[] {
  const addresses: string[] = [];

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return [...new Set(addresses)];
}

export function buildClientUrls(port: number | string): {
  local_url: string;
  network_urls: string[];
} {
  const local_url = `http://localhost:${port}`;
  const network_urls = getLanIPv4Addresses().map((ip) => `http://${ip}:${port}`);
  return { local_url, network_urls };
}

export function printDevServerUrls(label: string, port: number | string): void {
  const { local_url, network_urls } = buildClientUrls(port);

  console.log('');
  console.log(`${label}`);
  console.log(`  Local:   ${local_url}`);
  if (network_urls.length > 0) {
    for (const url of network_urls) {
      console.log(`  Network: ${url}`);
    }
  } else {
    console.log('  Network: (no LAN address found — check Wi-Fi connection)');
  }
  console.log('');
}

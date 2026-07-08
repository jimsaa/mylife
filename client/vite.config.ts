import os from 'node:os';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const APP_PORT = 3006;
const API_TARGET = 'http://127.0.0.1:3001';

function getLanIPv4Addresses(): string[] {
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

function printNetworkUrls(): void {
  const localUrl = `http://localhost:${APP_PORT}`;
  const networkUrls = getLanIPv4Addresses().map((ip) => `http://${ip}:${APP_PORT}`);

  console.log('');
  console.log('My Life frontend');
  console.log(`  Local:   ${localUrl}`);
  if (networkUrls.length > 0) {
    for (const url of networkUrls) {
      console.log(`  Network: ${url}`);
    }
  } else {
    console.log('  Network: (no LAN address found — check Wi-Fi connection)');
  }
  console.log('');
}

function networkAccessInfoPlugin(): Plugin {
  return {
    name: 'my-life-network-access-info',
    configureServer(server) {
      server.httpServer?.once('listening', printNetworkUrls);
    },
    configurePreviewServer(server) {
      server.httpServer?.once('listening', printNetworkUrls);
    },
  };
}

export default defineConfig({
  plugins: [react(), networkAccessInfoPlugin()],
  server: {
    host: '0.0.0.0',
    port: APP_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: APP_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});

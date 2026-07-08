import net from 'net';
import { execSync } from 'child_process';

const DEFAULT_PORT = 3006;
const port = parseInt(process.argv[2] ?? String(DEFAULT_PORT), 10);

function findBlockingProcess(listenPort) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${listenPort}`, { encoding: 'utf8' });
      const listening = output
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.includes('LISTENING'));

      if (!listening) return null;

      const pid = listening.split(/\s+/).at(-1);
      if (!pid) return null;

      let processName = 'unknown';
      try {
        const taskOutput = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
        const match = taskOutput.match(/"([^"]+)"/);
        if (match) processName = match[1];
      } catch {
        // Keep generic process name if tasklist fails.
      }

      return { pid, processName };
    }

    const pid = execSync(`lsof -i :${listenPort} -sTCP:LISTEN -t`, { encoding: 'utf8' })
      .trim()
      .split('\n')[0];

    if (!pid) return null;

    let processName = 'unknown';
    try {
      processName = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
    } catch {
      // Keep generic process name if ps fails.
    }

    return { pid, processName };
  } catch {
    return null;
  }
}

function isPortAvailable(listenPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.once('listening', () => {
      server.close(() => resolve());
    });

    server.listen(listenPort);
  });
}

try {
  await isPortAvailable(port);
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    const blocker = findBlockingProcess(port);

    console.error(`\nError: Port ${port} is already in use.\n`);

    if (blocker) {
      console.error(`Blocking process: ${blocker.processName} (PID ${blocker.pid})`);
      console.error('\nStop that process before starting My Life, or free port 3006 first.');
    } else {
      console.error('Another process is listening on port 3006.');
      console.error('\nStop that process before starting My Life.');
    }

    process.exit(1);
  }

  throw error;
}

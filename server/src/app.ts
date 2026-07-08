import express from 'express';
import cors from 'cors';
import { buildClientUrls } from './utils/networkAddresses.js';
import { getCorsOptions } from './utils/cors.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import timeEntryRoutes from './routes/timeEntryRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import wellbeingRoutes from './routes/wellbeingRoutes.js';
import sleepRoutes from './routes/sleepRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import taxiRoutes from './routes/taxiRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import sleepImportRoutes from './routes/sleepImportRoutes.js';
import dailySleepCheckinRoutes from './routes/dailySleepCheckinRoutes.js';
import teslaRoutes from './routes/teslaRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { requireAdminAuth } from './middleware/requireAdminAuth.js';

export function createApp() {
  const app = express();

  const corsOptions = getCorsOptions();
  if (corsOptions) {
    app.use(cors(corsOptions));
  } else {
    app.use(cors());
  }
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    const clientPort = process.env.MY_LIFE_CLIENT_PORT ?? '3006';
    const { local_url, network_urls } = buildClientUrls(clientPort);
    res.json({
      status: 'ok',
      app: 'My Life',
      server_time: new Date().toISOString(),
      client_port: Number(clientPort),
      local_url,
      network_urls,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use(requireAdminAuth);

  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/time-entries', timeEntryRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/journal', journalRoutes);
  app.use('/api/wellbeing', wellbeingRoutes);
  app.use('/api/sleep', sleepRoutes);
  app.use('/api/sleep-checkins', dailySleepCheckinRoutes);
  app.use('/api/sleep-import', sleepImportRoutes);
  app.use('/api/tesla', teslaRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/food', foodRoutes);
  app.use('/api/taxi', taxiRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/stats', statsRoutes);

  return app;
}

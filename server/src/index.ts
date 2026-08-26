import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { runSeeds } from './db/seeds/run.js';
import { startLegacyScheduler } from './modules/digital-legacy/scheduler.js';
import { printDevServerUrls } from './utils/networkAddresses.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
const CLIENT_PORT = process.env.MY_LIFE_CLIENT_PORT ?? '3006';

runMigrations();
runSeeds();

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`My Life API listening on http://${HOST}:${PORT}`);
  printDevServerUrls('Open My Life in your browser', CLIENT_PORT);
  startLegacyScheduler();
});

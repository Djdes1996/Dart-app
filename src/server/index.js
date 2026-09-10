#!/usr/bin/env node
/**
 * Darts starten.
 *
 * Poort en adres zijn in te stellen met de omgevingsvariabelen PORT en HOST.
 */

import { createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = createApp();

app.server.listen(PORT, HOST, () => {
  console.log(`Darts draait op http://localhost:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log('\nAfsluiten...');
    const forced = setTimeout(() => process.exit(0), 2000);
    forced.unref();
    await app.close();
    process.exit(0);
  });
}

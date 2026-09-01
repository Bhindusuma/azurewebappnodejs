'use strict';
require('dotenv').config();

const app = require('./src/app');
const store = require('./src/db');
const config = require('./src/config');

// App Service injects PORT. Never hardcode it, and always bind 0.0.0.0 so the
// platform's front end can reach the container.
const port = config.port;

async function main() {
  await store.init();

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({
      msg: 'listening',
      port,
      env: config.env,
      driver: store.driver,
      site: process.env.WEBSITE_SITE_NAME || 'local'
    }));
  });

  // App Service sends SIGTERM on restart, scale-in and slot swap. Drain in-flight
  // requests instead of dropping them.
  const shutdown = (signal) => {
    console.log(JSON.stringify({ msg: 'shutting down', signal }));
    server.close(async () => {
      await store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(JSON.stringify({ msg: 'startup failed', error: err.message, stack: err.stack }));
  process.exit(1);
});

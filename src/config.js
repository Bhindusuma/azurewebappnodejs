'use strict';

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production. Add it as an App Setting or a Key Vault reference.');
}

module.exports = {
  env,
  isProd,
  port: Number(process.env.PORT) || 8080,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  databaseUrl: process.env.DATABASE_URL || '',
  cookieName: 'kiln_session',
  sessionDays: 7,
  // App Service terminates TLS at the front end and forwards over http, so the app
  // must trust X-Forwarded-* to know the request was really https.
  trustProxy: 1
};

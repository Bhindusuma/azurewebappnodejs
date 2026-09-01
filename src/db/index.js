'use strict';

const config = require('../config');
const { createMemoryStore } = require('./memory');

let store;

if (config.databaseUrl) {
  const { createPostgresStore } = require('./postgres');
  store = createPostgresStore(config.databaseUrl);
} else {
  if (config.isProd) {
    console.warn(JSON.stringify({
      msg: 'DATABASE_URL is not set - running on the in-memory store. Progress will be lost on restart and will not be shared between instances.'
    }));
  }
  store = createMemoryStore();
}

module.exports = store;

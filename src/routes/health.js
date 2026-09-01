'use strict';

const express = require('express');
const store = require('../db');

const router = express.Router();

// Point App Service "Health check" at /healthz. The platform removes an instance
// from rotation after repeated failures, so this must test the dependencies the
// app cannot serve without - and nothing else, or a slow third party takes the
// whole site down.
router.get('/healthz', async (req, res) => {
  try {
    await store.ping();
    res.status(200).json({
      status: 'healthy',
      driver: store.driver,
      instance: process.env.WEBSITE_INSTANCE_ID || 'local',
      uptime: Math.round(process.uptime())
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Liveness only: answers as soon as the process is up. Use this as the warm-up
// ping path for slot swaps.
router.get('/readyz', (req, res) => res.status(200).send('ok'));

module.exports = router;

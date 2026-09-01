'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { loadUser } = require('./middleware/auth');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const learnRoutes = require('./routes/learn');

const app = express();

// One hop: the App Service front end. Without this, secure cookies are never set
// and every client looks like it came from the load balancer.
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  // App Service serves https at the edge; let the browser remember that.
  hsts: config.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false
}));

// One JSON object per line, straight to stdout, which is what App Service log
// streaming and Application Insights both read.
app.use(morgan(config.isProd ? 'combined' : 'dev', {
  skip: (req) => req.path === '/healthz' || req.path === '/readyz'
}));

app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.isProd ? '7d' : 0,
  etag: true
}));

app.use(healthRoutes);
app.use(loadUser);
app.use(authRoutes);
app.use(learnRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page not found',
    heading: 'That page is not here',
    message: 'The link may be out of date. The course catalogue is a good place to restart.'
  });
});

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ msg: 'request failed', path: req.path, error: err.message, stack: err.stack }));
  res.status(500).render('error', {
    title: 'Something broke',
    heading: 'Something broke on our side',
    message: 'The error has been logged. Reload the page, or head back to your dashboard.'
  });
});

module.exports = app;

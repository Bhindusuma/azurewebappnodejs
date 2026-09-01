'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../db');

// Stateless sessions. The signed cookie is verifiable by any instance, so scaling
// out or restarting the app does not log anyone out - which a server-side session
// store would, unless you added Redis.
function issueSession(res, user) {
  const token = jwt.sign(
    { sub: String(user.id), name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: `${config.sessionDays}d` }
  );

  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd, // App Service front end always serves https in production
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function clearSession(res) {
  res.clearCookie(config.cookieName, { path: '/' });
}

// Populates res.locals.user on every request. Never throws: a bad or expired
// cookie just means "signed out".
async function loadUser(req, res, next) {
  res.locals.user = null;
  const token = req.cookies?.[config.cookieName];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await store.getUserById(payload.sub);
    if (user) {
      req.user = user;
      res.locals.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    } else {
      clearSession(res);
    }
  } catch {
    clearSession(res);
  }
  next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  const next_ = encodeURIComponent(req.originalUrl);
  res.redirect(`/login?next=${next_}`);
}

module.exports = { issueSession, clearSession, loadUser, requireAuth };

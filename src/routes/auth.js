'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const store = require('../db');
const { issueSession, clearSession } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many attempts. Try again in a few minutes.'
});

const safeNext = (value) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard');

router.get('/register', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('register', { title: 'Create an account', error: null, values: {} });
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const values = { name, email };

    if (name.length < 2) {
      return res.status(400).render('register', { title: 'Create an account', error: 'Enter your name.', values });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).render('register', { title: 'Create an account', error: 'Enter a valid email address.', values });
    }
    if (password.length < 10) {
      return res.status(400).render('register', { title: 'Create an account', error: 'Use a password of at least 10 characters.', values });
    }
    if (await store.getUserByEmail(email)) {
      return res.status(409).render('register', { title: 'Create an account', error: 'That email is already registered. Sign in instead.', values });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await store.createUser({ email, name, passwordHash });
    issueSession(res, user);
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('login', { title: 'Sign in', error: null, next: safeNext(req.query.next), values: {} });
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const target = safeNext(req.body.next);

    const user = await store.getUserByEmail(email);
    const ok = user && (await bcrypt.compare(password, user.password_hash));

    if (!ok) {
      // Same message either way, so the form cannot be used to discover accounts.
      return res.status(401).render('login', {
        title: 'Sign in',
        error: 'That email and password do not match an account.',
        next: target,
        values: { email }
      });
    }

    issueSession(res, user);
    res.redirect(target);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.redirect('/');
});

module.exports = router;

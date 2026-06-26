const express = require('express');
const { getDb } = require('../db');
const gmailService = require('../services/gmailService');

const router = express.Router();

function getSetting(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  const db = getDb();
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

function getStoredTokens() {
  const raw = getSetting('gmail_tokens');
  return raw ? JSON.parse(raw) : null;
}

router.get('/gmail-url', (req, res) => {
  const url = gmailService.getAuthUrl();
  res.json({ url });
});

router.get('/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      const err = new Error('Missing authorization code.');
      err.statusCode = 400;
      throw err;
    }

    const tokens = await gmailService.getTokenFromCode(code);
    setSetting('gmail_tokens', JSON.stringify(tokens));

    try {
      const email = await gmailService.getUserEmail(tokens);
      if (email) setSetting('gmail_email', email);
    } catch (_) {}

    res.redirect('/?gmail_connected=true');
  } catch (err) {
    next(err);
  }
});

router.get('/status', (req, res) => {
  const tokens = getStoredTokens();
  const email = getSetting('gmail_email');
  res.json({ connected: Boolean(tokens), email: email || null });
});

module.exports = router;
module.exports.getStoredTokens = getStoredTokens;
module.exports.setSetting = setSetting;
module.exports.getSetting = getSetting;

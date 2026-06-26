const express = require('express');
const { getDb } = require('../db');
const { getStoredTokens } = require('./auth');
const gmailService = require('../services/gmailService');
const aiService = require('../services/aiService');

const router = express.Router();

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

router.get('/', (req, res) => {
  const db = getDb();
  const { status } = req.query;

  const jobs = status
    ? db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY detected_at DESC').all(status)
    : db.prepare('SELECT * FROM jobs ORDER BY detected_at DESC').all();

  res.json(jobs);
});

router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) throw notFound('Job not found.');

    const draft = db.prepare('SELECT * FROM drafts WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);
    res.json({ ...job, draft: draft || null });
  } catch (err) {
    next(err);
  }
});

router.post('/scan', async (req, res, next) => {
  try {
    const tokens = getStoredTokens();
    if (!tokens) {
      const err = new Error('Please connect your Gmail account first.');
      err.statusCode = 401;
      throw err;
    }

    const db = getDb();
    const emails = await gmailService.fetchJobEmails(tokens);

    const existingIds = new Set(
      db.prepare('SELECT email_id FROM jobs').all().map((row) => row.email_id)
    );
    const newEmails = emails.filter((email) => !existingIds.has(email.email_id));

    const created = [];

    for (const email of newEmails) {
      let extracted;
      try {
        extracted = await aiService.extractJobDetails(email.body);
      } catch (err) {
        continue;
      }

      if (!extracted.is_job_posting) continue;

      const insert = db.prepare(`
        INSERT INTO jobs (email_id, job_title, company, recruiter_email, job_description, source, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `);
      const result = insert.run(
        email.email_id,
        extracted.job_title || '',
        extracted.company || '',
        extracted.recruiter_email || email.from || '',
        extracted.job_description || '',
        'gmail'
      );

      created.push(result.lastInsertRowid);
    }

    res.json({ scanned: emails.length, newJobs: created.length, jobIds: created });
  } catch (err) {
    next(err);
  }
});

router.post('/mock', (req, res) => {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO jobs (email_id, job_title, company, recruiter_email, job_description, source, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);

  const mockId = `mock-${Date.now()}`;
  const result = insert.run(
    mockId,
    'Data Analyst',
    'Acme Analytics',
    'recruiter@acme-analytics.com',
    'We are seeking a Data Analyst skilled in Python, SQL, and Power BI to join our growing analytics team.',
    'mock'
  );

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(job);
});

router.put('/:id/approve', async (req, res, next) => {
  try {
    const db = getDb();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) throw notFound('Job not found.');

    const draft = db.prepare('SELECT * FROM drafts WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(job.id);

    if (draft?.gmail_draft_id) {
      const tokens = getStoredTokens();
      if (!tokens) {
        const err = new Error('Please connect your Gmail account first.');
        err.statusCode = 401;
        throw err;
      }
      await gmailService.sendDraft(tokens, draft.gmail_draft_id);
      db.prepare('UPDATE drafts SET sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(draft.id);
    }

    db.prepare("UPDATE jobs SET status = 'approved' WHERE id = ?").run(job.id);
    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/skip', (req, res, next) => {
  try {
    const db = getDb();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) throw notFound('Job not found.');

    db.prepare("UPDATE jobs SET status = 'skipped' WHERE id = ?").run(job.id);
    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) throw notFound('Job not found.');

    db.prepare('DELETE FROM drafts WHERE job_id = ?').run(job.id);
    db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

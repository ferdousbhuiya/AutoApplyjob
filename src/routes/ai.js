const express = require('express');
const { getDb } = require('../db');
const aiService = require('../services/aiService');

const router = express.Router();

router.post('/extract', async (req, res, next) => {
  try {
    const { emailBody } = req.body;
    if (!emailBody || typeof emailBody !== 'string' || !emailBody.trim()) {
      const err = new Error('emailBody is required.');
      err.statusCode = 400;
      throw err;
    }

    const jobDetails = await aiService.extractJobDetails(emailBody);
    res.json(jobDetails);
  } catch (err) {
    next(err);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      const err = new Error('jobId is required.');
      err.statusCode = 400;
      throw err;
    }

    const db = getDb();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      const err = new Error('Job not found.');
      err.statusCode = 404;
      throw err;
    }

    // requirements aren't stored in the DB schema; Claude infers them from job_description
    const application = await aiService.generateApplication({
      job_title: job.job_title,
      company: job.company,
      job_description: job.job_description,
      requirements: []
    });

    db.prepare(`
      INSERT INTO drafts (job_id, tailored_resume, cover_letter)
      VALUES (?, ?, ?)
    `).run(job.id, application.tailored_resume, application.cover_letter);

    db.prepare('UPDATE jobs SET fit_score = ?, fit_reason = ? WHERE id = ?').run(
      application.fit_score,
      application.fit_reason,
      job.id
    );

    res.json(application);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

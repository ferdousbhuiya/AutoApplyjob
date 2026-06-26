require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb, getDb } = require('./db');
const authRoutes = require('./routes/auth');
const { getStoredTokens } = authRoutes;
const jobsRoutes = require('./routes/jobs');
const aiRoutes = require('./routes/ai');
const errorHandler = require('./middleware/errorHandler');
const gmailService = require('./services/gmailService');
const aiService = require('./services/aiService');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/ai', aiRoutes);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use(errorHandler);

async function scanAndProcessEmails(tokens) {
  const db = getDb();
  const emails = await gmailService.fetchJobEmails(tokens);

  const existingIds = new Set(
    db.prepare('SELECT email_id FROM jobs').all().map((row) => row.email_id)
  );
  const newEmails = emails.filter((email) => !existingIds.has(email.email_id));

  for (const email of newEmails) {
    let extracted;
    try {
      extracted = await aiService.extractJobDetails(email.body);
    } catch (err) {
      console.error('Extraction failed for email', email.email_id, err.message);
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
    const jobId = result.lastInsertRowid;

    let application;
    try {
      application = await aiService.generateApplication(extracted);
    } catch (err) {
      console.error('Generation failed for job', jobId, err.message);
      continue;
    }

    let gmailDraftId = null;
    try {
      const draftBody = `${application.cover_letter}\n\n---\n\n${application.tailored_resume}`;
      const draft = await gmailService.createDraft(
        tokens,
        extracted.recruiter_email || email.from,
        `Application for ${extracted.job_title} at ${extracted.company}`,
        draftBody
      );
      gmailDraftId = draft.id;
    } catch (err) {
      console.error('Gmail draft creation failed for job', jobId, err.message);
    }

    db.prepare(`
      INSERT INTO drafts (job_id, tailored_resume, cover_letter, gmail_draft_id)
      VALUES (?, ?, ?, ?)
    `).run(jobId, application.tailored_resume, application.cover_letter, gmailDraftId);

    db.prepare('UPDATE jobs SET fit_score = ?, fit_reason = ? WHERE id = ?').run(
      application.fit_score,
      application.fit_reason,
      jobId
    );
  }
}

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  initDb().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    setInterval(async () => {
      try {
        const tokens = getStoredTokens();
        if (!tokens) return;
        await scanAndProcessEmails(tokens);
      } catch (err) {
        console.error('Polling error:', err.message);
      }
    }, 5 * 60 * 1000);
  });
}

module.exports = app;
module.exports.scanAndProcessEmails = scanAndProcessEmails;

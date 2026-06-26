# AutoApply — AI-Powered Resume & Cover Letter Builder
## Claude Code Project Brief

> Read this entire file before writing any code. This is a FAU HootCamp Week 3 assignment.
> Build everything described here. Do not skip any section.

---

## What You Are Building

A full-stack web app called **AutoApply** that:
1. Monitors Gmail for job posting emails (from LinkedIn alerts, Indeed, Glassdoor, recruiters, etc.)
2. Uses Claude AI to extract job details from each email
3. Uses Claude AI to tailor Ferdouse's resume + write a personalized cover letter
4. Saves the tailored application as a **Gmail draft** (does NOT auto-send)
5. Shows a **dashboard** where Ferdouse can review each job, approve or skip it, and send when ready

**Draft mode is intentional** — the user reviews and approves before anything is sent.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | Node.js + Express |
| AI | Anthropic Claude API (`claude-3-5-haiku-20241022`) |
| Email | Gmail API (OAuth2) |
| Database | SQLite (via `better-sqlite3`) |
| Deployment | Railway or Render |

---

## Project Structure to Create

```
Week-3/
├── CLAUDE.md                  ← this file
├── README.md                  ← update at end
├── .env.example
├── .gitignore
├── package.json
├── config/
│   └── resume.json            ← Ferdouse's base resume (already created)
├── src/
│   ├── server.js              ← Express entry point
│   ├── db.js                  ← SQLite setup
│   ├── routes/
│   │   ├── auth.js            ← Gmail OAuth routes
│   │   ├── jobs.js            ← Job CRUD routes
│   │   └── ai.js              ← AI feature routes
│   ├── services/
│   │   ├── gmailService.js    ← Gmail polling + draft creation
│   │   ├── aiService.js       ← Claude API calls
│   │   └── jobParser.js       ← Extract job data from email text
│   └── middleware/
│       └── errorHandler.js    ← Global error + rate limit handler
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       ← Main job list view
│   │   │   ├── JobCard.jsx         ← Single job with approve/skip/edit
│   │   │   ├── ResumePreview.jsx   ← Show tailored resume
│   │   │   ├── CoverLetterPreview.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ErrorMessage.jsx
│   │   └── api/
│   │       └── client.js           ← Axios API wrapper
│   ├── package.json
│   └── vite.config.js
├── tests/
│   ├── ai.test.js
│   ├── jobs.test.js
│   └── auth.test.js
└── api-docs/
    ├── endpoints.md            ← already created, update with real routes
    └── postman-collection.json ← create this
```

---

## Database Schema

Create these tables in SQLite via `src/db.js`:

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id TEXT UNIQUE,
  job_title TEXT,
  company TEXT,
  recruiter_email TEXT,
  job_description TEXT,
  source TEXT,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',  -- pending | approved | skipped | sent
  fit_score INTEGER,
  fit_reason TEXT
);

CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES jobs(id),
  tailored_resume TEXT,
  cover_letter TEXT,
  gmail_draft_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME
);
```

---

## Backend Implementation

### src/server.js

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const jobsRoutes = require('./routes/jobs');
const aiRoutes = require('./routes/ai');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/ai', aiRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
```

### src/db.js

Use `better-sqlite3`. Run the schema above on init. Export `getDb()`.

### src/services/aiService.js — AI FEATURE 1 & 2

This is the core AI file. Use `@anthropic-ai/sdk`.

**AI Feature 1 — Job Extraction:**
```javascript
async function extractJobDetails(emailBody) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Extract job details from this email. Return ONLY valid JSON with these fields:
      { "job_title": "", "company": "", "recruiter_email": "", "job_description": "", "requirements": [], "is_job_posting": true/false }
      
      Email:
      ${emailBody}`
    }]
  });
  return JSON.parse(message.content[0].text);
}
```

**AI Feature 2 — Resume + Cover Letter Tailoring:**
```javascript
async function generateApplication(jobDetails, baseResume) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a professional resume writer. Using the candidate's base resume below, create:
      1. A tailored resume that highlights skills matching the job requirements
      2. A personalized cover letter (3 paragraphs, professional tone)
      3. A fit score (0-100) with a one-line reason

      Return ONLY valid JSON:
      {
        "tailored_resume": "full resume text rewritten to match job",
        "cover_letter": "full cover letter text",
        "fit_score": 85,
        "fit_reason": "Strong match on Python and analytics skills"
      }

      JOB TITLE: ${jobDetails.job_title}
      COMPANY: ${jobDetails.company}
      REQUIREMENTS: ${jobDetails.requirements.join(', ')}
      JOB DESCRIPTION: ${jobDetails.job_description}

      CANDIDATE BASE RESUME:
      ${JSON.stringify(baseResume, null, 2)}`
    }]
  });
  return JSON.parse(message.content[0].text);
}
```

**Rate limiting:** Add a simple in-memory rate limiter — max 10 AI calls per minute. If exceeded, return 429 with message "Too many requests. Please wait a moment."

### src/services/gmailService.js

Use `googleapis` package. Implement:

1. `getAuthUrl()` — returns Gmail OAuth2 URL
2. `getTokenFromCode(code)` — exchanges auth code for tokens
3. `fetchJobEmails(tokens)` — searches Gmail for emails with subjects containing: "job", "opportunity", "position", "hiring", "recruiter", "application", "career". Returns last 10 unread emails. Filter out emails already in the DB by `email_id`.
4. `createDraft(tokens, to, subject, body)` — creates a Gmail draft with the tailored cover letter + resume as the body
5. `sendDraft(tokens, draftId)` — sends an existing draft

### src/routes/auth.js

```
GET  /api/auth/gmail-url    → returns { url } for OAuth login
GET  /api/auth/callback     → handles OAuth callback, saves tokens to DB
GET  /api/auth/status       → returns { connected: true/false }
```

Store tokens in a `settings` table: `key TEXT, value TEXT`.

### src/routes/jobs.js

```
GET    /api/jobs            → list all jobs (with status filter ?status=pending)
GET    /api/jobs/:id        → get one job with its draft
POST   /api/jobs/scan       → trigger Gmail scan manually
PUT    /api/jobs/:id/approve → approve job, triggers send draft
PUT    /api/jobs/:id/skip   → mark job as skipped
DELETE /api/jobs/:id        → delete a job record
```

### src/routes/ai.js

```
POST /api/ai/extract        → { emailBody } → extracts job details (AI Feature 1)
POST /api/ai/generate       → { jobId } → generates resume + cover letter (AI Feature 2)
```

### src/middleware/errorHandler.js

Catch all errors. Return:
- 429 for rate limit errors
- 503 if Claude API is unreachable (catch `anthropic` errors)
- 400 for validation errors
- 500 for everything else

Always return `{ error: "user friendly message" }`.

---

## Frontend Implementation

### Dashboard.jsx

Main view. On load, fetch `GET /api/jobs?status=pending`. Show:
- Header: "AutoApply Dashboard" + "Scan Gmail" button
- Count badge: "X jobs waiting for review"
- List of `<JobCard>` components
- Empty state: "No new job emails found. Click Scan Gmail to check."

### JobCard.jsx

Show per job:
- Job title + company name (bold)
- Fit score as a colored badge (green 80+, yellow 60-79, red <60)
- Fit reason text
- "View Resume" and "View Cover Letter" buttons (open modal/preview)
- Three action buttons: ✓ Approve & Send | ✗ Skip | ✎ Edit
- Loading spinner while AI is generating
- Error message if something fails

### Loading & Error States

- Show spinner during: Gmail scan, AI generation, send action
- Disable buttons while loading
- Show red error banner with the API error message if any request fails
- Auto-dismiss error after 5 seconds

---

## Environment Variables

```
# Anthropic
ANTHROPIC_API_KEY=

# Gmail OAuth
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:3001/api/auth/callback

# App
PORT=3001
NODE_ENV=development
```

---

## Candidate Resume (Pre-loaded)

The base resume is in `config/resume.json`. Load it in `aiService.js` with:
```javascript
const baseResume = require('../../config/resume.json');
```

**Candidate:** MD Ferdouse Hossain Bhuiya
**Background:** Electrical Engineer, 15+ years experience, now transitioning into data/tech roles.
**Key skills:** Python, SQL, Power BI, AutoCAD, MAXIMO, GIS
**Current role:** Teacher Assistant at Broward County Public Schools
**Education:** MS EE at FAU (in progress), Advanced Data Analytics Certificate (Broward College)

When generating the tailored resume, Claude should emphasize:
- Python and data analytics skills for tech/data roles
- Engineering expertise for engineering roles
- Leadership and training background for management roles

---

## Gmail Polling (Automated Scan)

Set up a polling interval in `server.js` that runs every 5 minutes:

```javascript
setInterval(async () => {
  try {
    const tokens = getStoredTokens(); // from settings table
    if (!tokens) return;
    await scanAndProcessEmails(tokens);
  } catch (err) {
    console.error('Polling error:', err.message);
  }
}, 5 * 60 * 1000);
```

`scanAndProcessEmails` should:
1. Fetch job emails from Gmail
2. For each new email: call AI Feature 1 (extract), then AI Feature 2 (generate)
3. Save job + draft to DB
4. Create Gmail draft via `gmailService.createDraft()`

---

## Error Handling Requirements (Assignment)

Handle ALL of these gracefully:
- Claude API timeout → 503 + "AI service temporarily unavailable. Please try again."
- Claude API rate limit → 429 + "Too many AI requests. Please wait a moment."
- Gmail not connected → 401 + "Please connect your Gmail account first."
- Email has no job info → skip silently (is_job_posting: false)
- JSON parse error from Claude → retry once, then return 500
- Invalid job ID → 404 + "Job not found."

---

## Tests to Write

In `tests/` using Jest + Supertest:

**ai.test.js:**
- POST /api/ai/extract with valid email body → returns job details
- POST /api/ai/extract with empty body → 400 error
- POST /api/ai/generate with valid jobId → returns resume + cover letter
- POST /api/ai/generate with invalid jobId → 404 error

**jobs.test.js:**
- GET /api/jobs → returns array
- PUT /api/jobs/:id/approve with valid id → status changes to approved
- PUT /api/jobs/:id/skip → status changes to skipped
- PUT /api/jobs/:id/approve with invalid id → 404

**auth.test.js:**
- GET /api/auth/status → returns { connected: false } when not authed

---

## package.json Scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --testEnvironment=node",
    "client": "cd client && npm run dev",
    "build": "cd client && npm run build"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "better-sqlite3": "latest",
    "cors": "latest",
    "dotenv": "latest",
    "express": "latest",
    "googleapis": "latest"
  },
  "devDependencies": {
    "jest": "latest",
    "nodemon": "latest",
    "supertest": "latest"
  }
}
```

---

## Build Order

Build in this exact order:

1. `package.json` (root + client)
2. `src/db.js` — database setup
3. `src/services/aiService.js` — AI features (most important)
4. `src/services/gmailService.js` — Gmail integration
5. `src/routes/auth.js`, `jobs.js`, `ai.js`
6. `src/middleware/errorHandler.js`
7. `src/server.js`
8. `client/` — React frontend (Dashboard, JobCard, previews)
9. `tests/` — test files
10. Update `README.md` with setup instructions and deployed URL placeholder

---

## Assignment Checklist

Before finishing, verify:
- [ ] At least 2 AI features work (extract + generate)
- [ ] Loading states show during AI calls
- [ ] Error messages are user-friendly
- [ ] Rate limiting returns 429 with message
- [ ] All test cases in `tests/` pass
- [ ] `api-docs/endpoints.md` matches real routes
- [ ] `docs/cost-analysis.md` has real Claude pricing filled in
- [ ] `.env.example` has all required keys
- [ ] `.gitignore` excludes `.env` and `node_modules`
- [ ] README has demo video link placeholder and deployed URL placeholder

---

## Important Notes

- Use `claude-3-5-haiku-20241022` — it's fast and cheap, perfect for this use case
- Always parse Claude responses as JSON — prompt explicitly asks for JSON only
- If Claude returns markdown-wrapped JSON (```json ... ```), strip the backticks before parsing
- The Gmail OAuth flow requires a Google Cloud project with Gmail API enabled — document this in README setup steps
- For local testing without Gmail, add a `POST /api/jobs/mock` route that creates a fake job for demo purposes
- Keep the UI clean and simple — the Gate evaluators care about function over flash

# API Endpoint Documentation

## Base URL

```
http://localhost:3001/api
```

---

## Auth (Gmail OAuth)

### GET /auth/gmail-url
Returns the Google OAuth2 consent URL to connect a Gmail account.

**Response (200):**
```json
{ "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

### GET /auth/callback
Handles the OAuth2 redirect from Google. Exchanges the `code` query param for tokens and stores them in the `settings` table.

### GET /auth/status
Returns whether a Gmail account is connected.

**Response (200):**
```json
{ "connected": true }
```

---

## Jobs

### GET /jobs
List all jobs. Optionally filter by status.

**Query Params:** `status` (pending | approved | skipped | sent)

**Response (200):**
```json
[
  {
    "id": 1,
    "email_id": "abc123",
    "job_title": "Data Analyst",
    "company": "Acme Corp",
    "recruiter_email": "hr@acme.com",
    "job_description": "...",
    "source": "gmail",
    "detected_at": "2026-06-24T00:00:00Z",
    "status": "pending",
    "fit_score": 85,
    "fit_reason": "Strong match on Python and analytics skills"
  }
]
```

### GET /jobs/:id
Get a single job along with its latest draft (resume + cover letter).

**Error (404):**
```json
{ "error": "Job not found." }
```

### POST /jobs/scan
Triggers a manual Gmail scan: fetches unread job-related emails, extracts job details (AI Feature 1), and saves new jobs.

**Error (401):**
```json
{ "error": "Please connect your Gmail account first." }
```

**Response (200):**
```json
{ "scanned": 10, "newJobs": 2, "jobIds": [5, 6] }
```

### POST /jobs/mock
Creates a fake job for local demo/testing without Gmail.

**Response (201):** job object

### PUT /jobs/:id/approve
Approves a job. If a draft exists with a Gmail draft ID, sends that draft. Sets job status to `approved`.

**Error (404):**
```json
{ "error": "Job not found." }
```

### PUT /jobs/:id/skip
Marks a job as `skipped`.

### DELETE /jobs/:id
Deletes a job and its draft.

**Response (200):**
```json
{ "message": "Job deleted" }
```

---

## AI Features

### POST /ai/extract
**AI Feature 1 — Job Extraction.** Extracts structured job details from raw email text using Claude.

**Request Body:**
```json
{ "emailBody": "raw email text..." }
```

**Response (200):**
```json
{
  "job_title": "Data Analyst",
  "company": "Acme Corp",
  "recruiter_email": "hr@acme.com",
  "job_description": "...",
  "requirements": ["SQL", "Python"],
  "is_job_posting": true
}
```

**Error (400):**
```json
{ "error": "emailBody is required." }
```

**Error (429 - Rate Limit):**
```json
{ "error": "Too many AI requests. Please wait a moment." }
```

**Error (503 - AI Unavailable):**
```json
{ "error": "AI service temporarily unavailable. Please try again." }
```

### POST /ai/generate
**AI Feature 2 — Resume + Cover Letter Tailoring.** Generates a tailored resume, cover letter, and fit score for a given job.

**Request Body:**
```json
{ "jobId": 1 }
```

**Response (200):**
```json
{
  "tailored_resume": "full resume text rewritten to match job",
  "cover_letter": "full cover letter text",
  "fit_score": 85,
  "fit_reason": "Strong match on Python and analytics skills"
}
```

**Error (404):**
```json
{ "error": "Job not found." }
```

---

## Error Codes Reference

| Code | Meaning |
|------|---------|
| 400 | Bad request / invalid input |
| 401 | Gmail not connected |
| 404 | Resource not found |
| 429 | AI rate limit exceeded (max 10 calls/min) |
| 500 | Internal server error |
| 503 | Claude API temporarily unavailable |

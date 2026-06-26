# AI Features Documentation

## Overview

AutoApply uses Claude to turn raw job-alert emails into ready-to-review application drafts.

---

## Feature 1: Job Extraction

**Description:**
Parses a raw job-alert/recruiter email and extracts structured fields (title, company, recruiter email, description, requirements), flagging whether the email is actually a job posting at all.

**AI Service:** Anthropic Claude (`claude-haiku-4-5-20251001`)

**How it works:**
1. Gmail polling (every 5 min) or a manual "Scan Gmail" click fetches unread emails matching job-related subject keywords.
2. Each new email body is sent to `POST /api/ai/extract`.
3. Claude returns structured JSON; emails where `is_job_posting: false` are skipped silently.
4. Real job postings are saved to the `jobs` table.

**Prompt Template:**
```
Extract job details from this email. Return ONLY valid JSON with these fields:
{ "job_title": "", "company": "", "recruiter_email": "", "job_description": "", "requirements": [], "is_job_posting": true/false }

Email:
<email body>
```

**Error Handling:**
- Claude API timeout/unreachable → 503 "AI service temporarily unavailable. Please try again."
- Rate limit hit → 429 "Too many AI requests. Please wait a moment."
- Empty `emailBody` → 400 validation error
- Malformed JSON from Claude → retried once, then 500

---

## Feature 2: Resume + Cover Letter Tailoring

**Description:**
Takes the candidate's base resume (`config/resume.json`) plus the extracted job details and produces a tailored resume, a 3-paragraph cover letter, and a 0–100 fit score with a one-line reason.

**AI Service:** Anthropic Claude (`claude-haiku-4-5-20251001`)

**How it works:**
1. User (or the polling job) triggers generation for a job via `POST /api/ai/generate` with `{ jobId }`.
2. Claude is prompted with the base resume and job requirements/description.
3. The response (tailored resume, cover letter, fit score, fit reason) is saved to the `drafts` table and the job's `fit_score`/`fit_reason` are updated.
4. A Gmail draft is created with the cover letter + resume — never auto-sent.

**Error Handling:**
- Same 503/429 handling as Feature 1.
- Invalid/unknown `jobId` → 404 "Job not found."

---

## Rate Limiting Strategy

- In-memory limiter: max 10 Claude calls per rolling 60-second window per server instance.
- Exceeding the limit returns `429 { "error": "Too many requests. Please wait a moment." }` immediately, without calling Claude.

---

## Loading & Error States (Frontend)

- `LoadingSpinner` shown during Gmail scan, AI generation, and approve/send actions; buttons disabled while busy.
- `ErrorMessage` banner shows the API's `error` message and auto-dismisses after 5 seconds.
- Dashboard shows an explicit empty state ("No new job emails found. Click Scan Gmail to check.") instead of a blank screen.

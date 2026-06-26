# Test Cases

## Auth Endpoints

| # | Test | Method | Input | Expected |
|---|------|--------|-------|----------|
| 1 | Gmail status when not connected | GET /auth/status | none | 200 + `{ connected: false }` |
| 2 | Get Gmail OAuth URL | GET /auth/gmail-url | none | 200 + `{ url }` |

---

## Job Endpoints

| # | Test | Method | Input | Expected |
|---|------|--------|-------|----------|
| 3 | List all jobs | GET /jobs | none | 200 + array |
| 4 | Approve valid job | PUT /jobs/:id/approve | valid id | 200 + status: approved |
| 5 | Approve invalid job | PUT /jobs/:id/approve | bad id | 404 error |
| 6 | Skip valid job | PUT /jobs/:id/skip | valid id | 200 + status: skipped |
| 7 | Scan Gmail without connection | POST /jobs/scan | no tokens stored | 401 error |
| 8 | Delete non-existent job | DELETE /jobs/:id | bad id | 404 error |

---

## AI Endpoints

| # | Test | Method | Input | Expected |
|---|------|--------|-------|----------|
| 9 | Extract job details, valid email | POST /ai/extract | email body text | 200 + job details JSON |
| 10 | Extract with empty body | POST /ai/extract | empty string | 400 error |
| 11 | Generate application, valid jobId | POST /ai/generate | existing job id | 200 + resume/cover letter/fit score |
| 12 | Generate application, invalid jobId | POST /ai/generate | unknown id | 404 error |
| 13 | AI rate limit handling | POST /ai/extract | >10 calls/min | 429 with message |

---

## Edge Cases

| # | Test | Expected |
|---|------|----------|
| 14 | Email with no job info | `is_job_posting: false`, skipped silently, not saved |
| 15 | Claude returns markdown-fenced JSON | Backticks stripped, parsed successfully |
| 16 | Claude returns malformed JSON | Retried once, then 500 |
| 17 | Claude API unreachable/timeout | 503 "AI service temporarily unavailable" |

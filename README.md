# AutoApply — AI-Powered Resume & Cover Letter Builder

> **Demo Video:** [https://youtu.be/a3VRge-jrEo](https://youtu.be/a3VRge-jrEo)
> **Live App:** [https://autoapplyjob-production.up.railway.app](https://autoapplyjob-production.up.railway.app)

FAU HootCamp Week 3 assignment. AutoApply monitors Gmail for job-posting emails, uses Claude to extract job details and tailor a resume + cover letter, and saves the result as a **Gmail draft** for the user to review and send — nothing is auto-sent.

---

## Project Overview

1. Polls Gmail every 5 minutes (and on-demand via "Scan Gmail") for unread emails matching job-related keywords.
2. **AI Feature 1 — Job Extraction:** Claude reads each email and extracts job title, company, recruiter email, description, and requirements, flagging non-job emails so they're skipped.
3. **AI Feature 2 — Resume + Cover Letter Tailoring:** Claude rewrites the candidate's base resume and writes a personalized cover letter, plus a 0–100 fit score with a reason.
4. The tailored application is saved as a Gmail draft (draft mode only — never auto-sent).
5. The React dashboard lists pending jobs with fit scores; the user can preview the resume/cover letter, edit the cover letter, approve & send, or skip.

---

## AI Features

### Feature 1: Job Extraction
- **What it does:** Extracts structured job data from raw email text.
- **AI Service Used:** Anthropic Claude (`claude-haiku-4-5-20251001`)
- **Endpoint:** `POST /api/ai/extract`

### Feature 2: Resume + Cover Letter Generation
- **What it does:** Generates a tailored resume, cover letter, and fit score for a given job.
- **AI Service Used:** Anthropic Claude (`claude-haiku-4-5-20251001`)
- **Endpoint:** `POST /api/ai/generate`

See [`docs/ai-features.md`](./docs/ai-features.md) for prompt templates and error handling details.

---

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)
- **Email:** Gmail API (OAuth2, via `googleapis`)
- **Database:** SQLite (`better-sqlite3`)
- **Deployment:** Railway or Render

---

## Getting Started

### Prerequisites
- Node.js v18+
- An Anthropic API key
- A Google Cloud project with the **Gmail API** enabled, plus an OAuth2 Client ID/Secret (Web application type) with redirect URI `http://localhost:3001/api/auth/callback`

### Installation

```bash
git clone <your-repo-url>
cd Week-3
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET in .env
npm install
cd client && npm install && cd ..
```

### Running locally

```bash
# Terminal 1 — backend (http://localhost:3001)
npm run dev

# Terminal 2 — frontend (http://localhost:5173, proxies /api to :3001)
npm run client
```

Open `http://localhost:5173`, click **Scan Gmail** (after connecting Gmail via `GET /api/auth/gmail-url`), or click **Add Demo Job** to try the flow without Gmail.

### Connecting Gmail
1. Visit `GET /api/auth/gmail-url` to get the OAuth consent URL, open it, and approve access.
2. Google redirects to `/api/auth/callback`, which stores the tokens.
3. `GET /api/auth/status` confirms `{ connected: true }`.

---

## API Documentation

Full endpoint documentation is in [`api-docs/endpoints.md`](./api-docs/endpoints.md). A ready-to-import Postman collection is in [`api-docs/postman-collection.json`](./api-docs/postman-collection.json).

---

## Testing

```bash
npm test
```

Test cases (Jest + Supertest) live in `tests/`: `ai.test.js`, `jobs.test.js`, `auth.test.js`. The Anthropic SDK is mocked so tests run without hitting the real API.

---

## Cost Analysis

See [`docs/cost-analysis.md`](./docs/cost-analysis.md) for estimated Claude API usage and costs.

---

## Deployment

**Live URL:** [Add your deployed URL here]

Deployment notes:
- Set `ANTHROPIC_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` (pointing at the deployed domain), and `PORT` as environment variables on the host.
- Run `npm run build` to build the React client into `client/dist`; `src/server.js` serves it as static files and falls back to `index.html` for non-API routes.
- The SQLite file (`autoapply.db`) is created on first run — ensure the deployment's filesystem persists across restarts, or swap `DATABASE_PATH` for a mounted volume.

---

## License

MIT

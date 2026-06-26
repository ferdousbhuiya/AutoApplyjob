const Anthropic = require('@anthropic-ai/sdk');
const baseResume = require('../../config/resume.json');

const MODEL = 'claude-haiku-4-5-20251001';
const RATE_LIMIT_MAX_CALLS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

let anthropic = null;
function getClient() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

// --- Simple in-memory rate limiter: max N calls per rolling window ---
const callTimestamps = [];

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
  }
}

function checkRateLimit() {
  const now = Date.now();
  while (callTimestamps.length && now - callTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    callTimestamps.shift();
  }
  if (callTimestamps.length >= RATE_LIMIT_MAX_CALLS) {
    throw new RateLimitError('Too many requests. Please wait a moment.');
  }
  callTimestamps.push(now);
}

function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

async function callClaudeForJson(prompt, maxTokens, { retryOnParseError = true } = {}) {
  checkRateLimit();
  const client = getClient();

  let message;
  try {
    message = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });
  } catch (err) {
    if (err?.status === 429) {
      throw new RateLimitError('Too many AI requests. Please wait a moment.');
    }
    const serviceErr = new Error('AI service temporarily unavailable. Please try again.');
    serviceErr.statusCode = 503;
    throw serviceErr;
  }

  const rawText = message.content?.[0]?.text ?? '';
  const cleaned = stripCodeFences(rawText);

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    if (!retryOnParseError) {
      const err = new Error('AI returned an invalid response. Please try again.');
      err.statusCode = 500;
      throw err;
    }
    return callClaudeForJson(prompt, maxTokens, { retryOnParseError: false });
  }
}

// --- AI Feature 1: Job Extraction ---
async function extractJobDetails(emailBody) {
  const prompt = `Extract job details from this email. Return ONLY valid JSON with these fields:
{ "job_title": "", "company": "", "recruiter_email": "", "job_description": "", "requirements": [], "is_job_posting": true/false }

Email:
${emailBody}`;

  return callClaudeForJson(prompt, 1024);
}

// --- AI Feature 2: Resume + Cover Letter Tailoring ---
async function generateApplication(jobDetails, resume = baseResume) {
  const requirements = Array.isArray(jobDetails.requirements) ? jobDetails.requirements.join(', ') : '';

  const prompt = `You are a professional resume writer. Using the candidate's base resume below, create:
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
REQUIREMENTS: ${requirements}
JOB DESCRIPTION: ${jobDetails.job_description}

CANDIDATE BASE RESUME:
${JSON.stringify(resume, null, 2)}`;

  return callClaudeForJson(prompt, 4096);
}

module.exports = {
  extractJobDetails,
  generateApplication,
  RateLimitError,
  baseResume
};

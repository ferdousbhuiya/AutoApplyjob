process.env.DATABASE_PATH = ':memory:';
process.env.ANTHROPIC_API_KEY = 'test-key';

jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  function Anthropic() {
    return { messages: { create: mockCreate } };
  }
  Anthropic.__mockCreate = mockCreate;
  return Anthropic;
});

const request = require('supertest');
const Anthropic = require('@anthropic-ai/sdk');
const { initDb, getDb } = require('../src/db');
const app = require('../src/server');

function mockClaudeJson(obj) {
  Anthropic.__mockCreate.mockResolvedValueOnce({
    content: [{ text: JSON.stringify(obj) }]
  });
}

beforeAll(async () => {
  await initDb();
});

beforeEach(() => {
  Anthropic.__mockCreate.mockReset();
});

describe('POST /api/ai/extract', () => {
  it('returns job details for a valid email body', async () => {
    mockClaudeJson({
      job_title: 'Data Analyst',
      company: 'Acme Corp',
      recruiter_email: 'hr@acme.com',
      job_description: 'Analyze data',
      requirements: ['SQL', 'Python'],
      is_job_posting: true
    });

    const res = await request(app)
      .post('/api/ai/extract')
      .send({ emailBody: 'We are hiring a Data Analyst at Acme Corp...' });

    expect(res.status).toBe(200);
    expect(res.body.job_title).toBe('Data Analyst');
    expect(res.body.is_job_posting).toBe(true);
  });

  it('returns 400 for an empty body', async () => {
    const res = await request(app).post('/api/ai/extract').send({ emailBody: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/ai/generate', () => {
  it('returns resume and cover letter for a valid jobId', async () => {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO jobs (email_id, job_title, company, recruiter_email, job_description, source, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run('email-1', 'Data Analyst', 'Acme Corp', 'hr@acme.com', 'Analyze data', 'mock');

    mockClaudeJson({
      tailored_resume: 'Tailored resume text',
      cover_letter: 'Dear Hiring Manager...',
      fit_score: 85,
      fit_reason: 'Strong match'
    });

    const res = await request(app).post('/api/ai/generate').send({ jobId: result.lastInsertRowid });

    expect(res.status).toBe(200);
    expect(res.body.tailored_resume).toBe('Tailored resume text');
    expect(res.body.fit_score).toBe(85);
  });

  it('returns 404 for an invalid jobId', async () => {
    const res = await request(app).post('/api/ai/generate').send({ jobId: 999999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

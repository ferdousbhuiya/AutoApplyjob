process.env.DATABASE_PATH = ':memory:';
process.env.ANTHROPIC_API_KEY = 'test-key';

jest.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return { messages: { create: jest.fn() } };
  }
  return Anthropic;
});

const request = require('supertest');
const { initDb, getDb } = require('../src/db');
const app = require('../src/server');

beforeAll(async () => {
  await initDb();
});

function insertJob(emailId) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO jobs (email_id, job_title, company, recruiter_email, job_description, source, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    )
    .run(emailId, 'Data Analyst', 'Acme Corp', 'hr@acme.com', 'Analyze data', 'mock');
  return result.lastInsertRowid;
}

describe('GET /api/jobs', () => {
  it('returns an array', async () => {
    insertJob('job-list-1');
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('PUT /api/jobs/:id/approve', () => {
  it('changes status to approved for a valid id', async () => {
    const jobId = insertJob('job-approve-1');
    const res = await request(app).put(`/api/jobs/${jobId}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('returns 404 for an invalid id', async () => {
    const res = await request(app).put('/api/jobs/999999/approve');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('PUT /api/jobs/:id/skip', () => {
  it('changes status to skipped', async () => {
    const jobId = insertJob('job-skip-1');
    const res = await request(app).put(`/api/jobs/${jobId}/skip`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('skipped');
  });
});

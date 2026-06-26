process.env.DATABASE_PATH = ':memory:';
process.env.ANTHROPIC_API_KEY = 'test-key';

jest.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return { messages: { create: jest.fn() } };
  }
  return Anthropic;
});

const request = require('supertest');
const { initDb } = require('../src/db');
const app = require('../src/server');

beforeAll(async () => {
  await initDb();
});

describe('GET /api/auth/status', () => {
  it('returns connected: false when not authenticated', async () => {
    const res = await request(app).get('/api/auth/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: false });
  });
});

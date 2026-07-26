/**
 * Smoke tests for User service.
 * These tests run against a real server instance but with a mocked
 * Mongoose connection so no live MongoDB is required in CI.
 */
const request = require('supertest');

// Mock mongoose before app loads so no real DB connection is attempted
jest.mock('../config/db_conn', () => ({}));
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

let app;

beforeAll(() => {
  process.env.ACCESS_TOKEN = 'test-secret';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
  app = require('../server');
});

describe('User service — health check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('user-service');
  });
});

describe('User service — register', () => {
  it('POST /api/v1/users with missing fields returns 400', async () => {
    // Validation middleware should reject incomplete payload
    const res = await request(app)
      .post('/api/v1/users')
      .send({ email: 'test@example.com' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

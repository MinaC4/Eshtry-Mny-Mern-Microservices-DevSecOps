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

  it('POST /api/v1/users with age as numeric string passes validation', async () => {
    // age sent as string "25" should be coerced to number by z.coerce.number()
    const res = await request(app)
      .post('/api/v1/users')
      .send({
        email: 'valid@example.com',
        password: 'securePass123',
        firstName: 'Test',
        lastName: 'User',
        age: '25',
        phone: '+1234567890',
        gender: 'male'
      });
    // Should pass validation (may fail at DB layer since mocked, but not 400)
    expect(res.status).not.toBe(400);
  });
});

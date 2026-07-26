/**
 * Smoke tests for Cart service.
 */
const request = require('supertest');

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
  process.env.PRODUCT_SERVICE_URL = 'http://localhost:9000';
  app = require('../server');
});

describe('Cart service — health check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('cart-service');
  });
});

describe('Cart service — auth guard', () => {
  it('GET /api/v1/cart without token returns 401', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });
});

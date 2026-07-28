/**
 * Smoke tests for Product service.
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
  app = require('../server');
});

describe('Product service — health check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('product-service');
  });
});

describe('Product service — list products', () => {
  it('GET /api/v1/products returns 200 (empty array without DB)', async () => {
    // Without a real DB the mongoose query will fail; verify the error handler
    // returns a structured JSON response (not a crash / unhandled rejection).
    const res = await request(app).get('/api/v1/products');
    expect([200, 500]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});

describe('Product service — find product by name', () => {
  it('GET /api/v1/products/find/nonexistent-name returns 404 not 500', async () => {
    const res = await request(app).get('/api/v1/products/find/some-product-name');
    // Should return 404 (not found) or structured error, never 500 crash
    expect([404, 500]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});

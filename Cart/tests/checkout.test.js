/**
 * Cart checkout behaviour (unit): a real Order is persisted and a server-generated
 * orderId is returned; upstream product failures surface as 502, never a silent cart.
 */
const mockGet = jest.fn();

jest.mock('../config/db_conn', () => ({}));
jest.mock('../config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('axios', () => ({ create: () => ({ get: mockGet }) }));
jest.mock('axios-retry', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../models/cartModel', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteMany: jest.fn()
}));
jest.mock('../models/orderModel', () => ({ create: jest.fn() }));

const CartModel = require('../models/cartModel');
const OrderModel = require('../models/orderModel');
const { checkout } = require('../controllers/cartController');

const mockRes = () => {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('cart checkout', () => {
  it('persists an order and returns a server-generated orderId (201)', async () => {
    CartModel.find.mockResolvedValue([{ ProductId: '507f1f77bcf86cd799439011' }]);
    mockGet.mockResolvedValue({ data: { _id: '507f1f77bcf86cd799439011', name: 'Game', price: 10, category: 'Action' } });
    OrderModel.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439099', createdAt: '2026-09-24T00:00:00.000Z' });
    CartModel.deleteMany.mockResolvedValue({});

    const res = mockRes();
    await checkout({ user: { id: 'u1' } }, res, jest.fn());

    expect(OrderModel.create).toHaveBeenCalled();
    expect(CartModel.deleteMany).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body.orderId).toBe('507f1f77bcf86cd799439099');
    expect(res.body.total).toBe(10);
  });

  it('returns 502 when the product service fails (no silent partial cart)', async () => {
    CartModel.find.mockResolvedValue([{ ProductId: 'x' }]);
    mockGet.mockRejectedValue(new Error('429 Too Many Requests'));

    const res = mockRes();
    await checkout({ user: { id: 'u1' } }, res, jest.fn());

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('UpstreamError');
  });

  it('returns 400 for an empty cart', async () => {
    CartModel.find.mockResolvedValue([]);

    const res = mockRes();
    await checkout({ user: { id: 'u1' } }, res, jest.fn());

    expect(res.statusCode).toBe(400);
  });
});

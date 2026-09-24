/**
 * Schema-level tests: public registration must never accept a client-supplied role.
 */
const { registerSchema } = require('../middleware/validateRequest');

describe('register schema — role safety', () => {
  it('strips a client-supplied role (public registration is always customer)', () => {
    const result = registerSchema.safeParse({
      body: {
        email: 'attacker@example.com',
        password: 'Password123',
        firstName: 'A',
        lastName: 'B',
        age: 25,
        phone: '+1234567890',
        gender: 'male',
        role: 'admin'
      }
    });
    expect(result.success).toBe(true);
    expect(result.data.body.role).toBeUndefined();
  });
});

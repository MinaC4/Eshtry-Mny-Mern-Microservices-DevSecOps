const { z } = require('zod');

const phoneSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/[\s\-()]/g, '') : v),
  z.string().regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
);

const genderSchema = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.enum(['male', 'female', 'other']).optional()
);

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    age: z.coerce.number().int().min(13).max(120),
    phone: phoneSchema,
    gender: genderSchema
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req);
  if (!result.success) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Validation failed',
      details: result.error.flatten().fieldErrors
    });
  }
  next();
};

module.exports = { validate, registerSchema, loginSchema };

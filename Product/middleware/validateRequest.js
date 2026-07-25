const { z } = require('zod');

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    price: z.number().positive(),
    description: z.string().max(1000).optional(),
    category: z.string().max(50).optional(),
    image: z.string().url().optional()
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

module.exports = { validate, createProductSchema };

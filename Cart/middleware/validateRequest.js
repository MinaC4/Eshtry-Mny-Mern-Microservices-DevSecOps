const { z } = require('zod');

const addCartSchema = z.object({
  params: z.object({
    productid: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID')
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

module.exports = { validate, addCartSchema };

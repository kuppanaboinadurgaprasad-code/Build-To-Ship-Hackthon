import { ZodError } from 'zod';

/**
 * Generic Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/route', validate(MyZodSchema), handler)
 *
 * Validates `req.body` against the provided schema.
 * On success  → attaches the parsed (and stripped) data to `req.body` and calls `next()`.
 * On failure  → returns 400 with a structured error array.
 *
 * @param {import('zod').ZodTypeAny} schema - A Zod schema object.
 */
const validate = (schema) => (req, res, next) => {
  try {
    // `parse` throws ZodError on failure; returns cleaned data on success
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map((issue) => ({
        field: issue.path.join('.') || 'root',
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors,
      });
    }

    // Unexpected errors bubble up
    console.error('[Validate Middleware] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during validation.',
    });
  }
};

export default validate;

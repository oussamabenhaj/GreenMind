/**
 * validate({ body, query, params }) — parses the request with zod schemas.
 * Parsed (coerced) values replace req.body / req.query / req.params.
 */
export const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) {
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    next();
  } catch (error) {
    next(error);
  }
};

/** Wraps an async controller so rejected promises reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Wraps every function of a controller object with asyncHandler. */
export const wrapController = (controller) => Object.fromEntries(
  Object.entries(controller).map(([name, fn]) => [name, asyncHandler(fn)]),
);

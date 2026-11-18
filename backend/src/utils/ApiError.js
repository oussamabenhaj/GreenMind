export class ApiError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) { return new ApiError(400, message, 'BAD_REQUEST', details); }
  static unauthorized(message = 'Authentification requise') { return new ApiError(401, message, 'UNAUTHORIZED'); }
  static forbidden(message = 'Accès refusé') { return new ApiError(403, message, 'FORBIDDEN'); }
  static notFound(message = 'Ressource introuvable') { return new ApiError(404, message, 'NOT_FOUND'); }
  static conflict(message) { return new ApiError(409, message, 'CONFLICT'); }
}

/** Throws a 404 when `row` is falsy, otherwise returns it. */
export function found(row, message) {
  if (!row) throw ApiError.notFound(message);
  return row;
}

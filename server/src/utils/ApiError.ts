export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  errors: FieldError[];

  constructor(statusCode: number, message: string, code = 'ERROR', errors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(message: string, code = 'BAD_REQUEST', errors: FieldError[] = []) {
    return new ApiError(400, message, code, errors);
  }

  static unauthorized(message = 'Authentication is required', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static unprocessable(message: string, code = 'UNPROCESSABLE', errors: FieldError[] = []) {
    return new ApiError(422, message, code, errors);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new ApiError(429, message, code);
  }

  static serviceUnavailable(message: string, code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, message, code);
  }
}

import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { ApiError, type FieldError } from '../utils/ApiError';

interface ErrorBody {
  success: false;
  message: string;
  code: string;
  errors: FieldError[];
  stack?: string;
}

function isBodyParserError(error: unknown): error is { type: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error as { type?: string }).type === 'entity.parse.failed'
  );
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.path} was not found`, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred.';
  let errors: FieldError[] = [];

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    errors = error.errors;
  } else if (error instanceof MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = 'UPLOAD_ERROR';
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `File exceeds the ${env.MAX_UPLOAD_MB}MB upload limit.`
        : 'File upload failed.';
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Database validation failed.';
    errors = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'The provided identifier is invalid.';
  } else if (isBodyParserError(error)) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body contains invalid JSON.';
  } else if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    message = 'A record with that unique value already exists.';
  } else if (error instanceof Error) {
    console.error(`[error] ${req.method} ${req.path}:`, error.message);
  }

  if (statusCode >= 500) {
    console.error('[error] Unhandled request failure:', error);
  }

  const body: ErrorBody = { success: false, message, code, errors };
  if (!env.isProduction && error instanceof Error && statusCode >= 500) {
    body.stack = error.stack;
  }

  res.status(statusCode).json(body);
}

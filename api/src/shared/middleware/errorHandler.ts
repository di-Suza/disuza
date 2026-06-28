import type { ErrorRequestHandler } from 'express';

import logger from '../../config/logger.js';
import { AppError } from '../errors/index.js';

type NormalizedError = {
  statusCode: number;
  message: string;
  details: unknown;
};

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    };
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    const namedError = error as { name?: string; message?: string; code?: number; keyValue?: unknown; errors?: unknown };

    if (namedError.name === 'CastError') {
      return {
        statusCode: 400,
        message: 'Invalid resource id',
        details: null,
      };
    }

    if (namedError.name === 'ValidationError') {
      return {
        statusCode: 400,
        message: namedError.message || 'Validation error',
        details: namedError.errors || null,
      };
    }

    if (namedError.code === 11000) {
      return {
        statusCode: 409,
        message: 'Duplicate value already exists',
        details: namedError.keyValue || null,
      };
    }
  }

  return {
    statusCode: 500,
    message: 'Internal server error',
    details: null,
  };
}

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    logger.error({ error, path: req.originalUrl }, 'Unhandled request error');
  }

  res.status(normalized.statusCode).json({
    success: false,
    message: normalized.message,
    details: normalized.details,
  });
};

export { normalizeError };
export default errorHandler;
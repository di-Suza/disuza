import type { ErrorRequestHandler } from 'express';

import logger from '../../config/logger.js';
import AppError from '../errors/AppError.js';

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Internal server error';
  const details = error instanceof AppError ? error.details : null;

  if (statusCode >= 500) {
    logger.error({ error, path: req.originalUrl }, 'Unhandled request error');
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
  });
};

export default errorHandler;

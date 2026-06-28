import type { RequestHandler } from 'express';

import AppError from '../errors/AppError.js';

const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export default notFoundHandler;

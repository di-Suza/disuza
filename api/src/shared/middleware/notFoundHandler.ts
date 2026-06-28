import type { RequestHandler } from 'express';

import { NotFoundError } from '../errors/index.js';

const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFoundHandler;
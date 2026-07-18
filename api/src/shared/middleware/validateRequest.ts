import type { RequestHandler } from 'express';
import { validationResult, type ValidationError as ExpressValidationError } from 'express-validator';

import { ValidationError } from '../errors/index.js';

function toValidationDetails(errors: ExpressValidationError[]) {
  return errors.map((error) => ({
    field: error.type === 'field' ? error.path : error.type,
    message: error.msg,
    location: 'location' in error ? error.location : undefined,
    value: error.type === 'field' ? error.value : undefined,
  }));
}

const validateRequest: RequestHandler = (req, _res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return next(new ValidationError('Validation failed', toValidationDetails(result.array())));
};

export default validateRequest;
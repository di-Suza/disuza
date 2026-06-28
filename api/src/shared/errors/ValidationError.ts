import HttpStatus from '../constants/httpStatus.js';
import AppError from './AppError.js';

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: unknown = null) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export default ValidationError;
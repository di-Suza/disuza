import HttpStatus from '../constants/httpStatus.js';
import AppError from './AppError.js';

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details: unknown = null) {
    super(message, HttpStatus.FORBIDDEN, details);
  }
}

export default ForbiddenError;
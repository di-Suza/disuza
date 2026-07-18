import HttpStatus from '../constants/httpStatus.js';
import AppError from './AppError.js';

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details: unknown = null) {
    super(message, HttpStatus.UNAUTHORIZED, details);
  }
}

export default UnauthorizedError;
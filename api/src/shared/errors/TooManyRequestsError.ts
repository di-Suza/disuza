import HttpStatus from '../constants/httpStatus.js';
import AppError from './AppError.js';

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details: unknown = null) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, details);
  }
}

export default TooManyRequestsError;
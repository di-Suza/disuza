import HttpStatus from '../constants/httpStatus.js';
import AppError from './AppError.js';

class BadRequestError extends AppError {
  constructor(message = 'Bad request', details: unknown = null) {
    super(message, HttpStatus.BAD_REQUEST, details);
  }
}

export default BadRequestError;
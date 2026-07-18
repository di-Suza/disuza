import HttpStatus from '../constants/httpStatus.js';
import AppError from './AppError.js';

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details: unknown = null) {
    super(message, HttpStatus.NOT_FOUND, details);
  }
}

export default NotFoundError;
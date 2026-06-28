import HttpStatus from '../constants/httpStatus.js';
import AppError from './AppError.js';

class ConflictError extends AppError {
  constructor(message = 'Conflict', details: unknown = null) {
    super(message, HttpStatus.CONFLICT, details);
  }
}

export default ConflictError;
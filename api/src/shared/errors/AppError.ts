class AppError extends Error {
  readonly isOperational = true;

  constructor(
    message: string,
    readonly statusCode = 500,
    readonly details: unknown = null,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}

export default AppError;
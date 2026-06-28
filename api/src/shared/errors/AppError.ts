class AppError extends Error {
  readonly isOperational = true;

  constructor(
    message: string,
    readonly statusCode = 500,
    readonly details: unknown = null,
  ) {
    super(message);
  }
}

export default AppError;

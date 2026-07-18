import type { NextFunction, Request, RequestHandler, Response } from 'express';

type MockRequestOptions = Partial<Request> & {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  user?: NonNullable<Request['user']>;
  file?: Express.Multer.File;
  files?: Request['files'];
};

type ControllerResult<T = unknown> = {
  statusCode: number;
  body: T;
  headers: Record<string, string | number | readonly string[]>;
  sent: unknown;
};

const defaultUser: NonNullable<Request['user']> = {
  id: '507f1f77bcf86cd799439011',
  userName: 'Test User',
  email: 'test@example.com',
  role: 'USER',
  active: true,
  profilePicture: undefined,
};

function createMockRequest(options: MockRequestOptions = {}): Request {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || defaultUser,
    file: options.file,
    files: options.files,
    ip: '127.0.0.1',
    socket: {
      remoteAddress: '127.0.0.1',
    },
    ...options,
  } as Request;
}

function invokeController<T = unknown>(
  handler: RequestHandler,
  options: MockRequestOptions = {},
): Promise<ControllerResult<T>> {
  return new Promise((resolve, reject) => {
    const result: ControllerResult<T> = {
      statusCode: 200,
      body: undefined as T,
      headers: {},
      sent: undefined,
    };

    const res = {
      status(code: number) {
        result.statusCode = code;
        return this;
      },
      json(body: T) {
        result.body = body;
        resolve(result);
        return this;
      },
      send(body: unknown) {
        result.sent = body;
        resolve(result);
        return this;
      },
      setHeader(name: string, value: string | number | readonly string[]) {
        result.headers[name] = value;
        return this;
      },
      cookie() {
        return this;
      },
      clearCookie() {
        return this;
      },
    } as unknown as Response;

    const next: NextFunction = (error?: unknown) => {
      if (error) {
        reject(error);
      }
    };

    handler(createMockRequest(options), res, next);
  });
}

export { createMockRequest, defaultUser, invokeController, type ControllerResult };

import { type Server } from 'node:http';
import { type AddressInfo } from 'node:net';

import type { Express } from 'express';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type TestHttpResponse<T = unknown> = {
  status: number;
  headers: Headers;
  body: T;
  text: string;
};

type TestHttpClient = {
  request: <T = unknown>(path: string, options?: RequestOptions) => Promise<TestHttpResponse<T>>;
  close: () => Promise<void>;
};

async function createHttpClient(app: Express): Promise<TestHttpClient> {
  const server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, () => resolve(instance));
    instance.once('error', reject);
  });

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    async request<T = unknown>(path: string, options: RequestOptions = {}) {
      const headers = new Headers(options.headers || {});
      let body: BodyInit | undefined;

      if (options.body !== undefined) {
        headers.set('content-type', 'application/json');
        body = JSON.stringify(options.body);
      }

      const response = await fetch(`${baseUrl}${path}`, {
        method: options.method || 'GET',
        headers,
        body,
      });
      const text = await response.text();
      const parsedBody = text ? JSON.parse(text) as T : null as T;

      return {
        status: response.status,
        headers: response.headers,
        body: parsedBody,
        text,
      };
    },
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

export { createHttpClient, type TestHttpClient, type TestHttpResponse };

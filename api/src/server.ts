import http from 'node:http';
import { fileURLToPath } from 'node:url';

import app from './app.js';
import database from './config/db.js';
import env from './config/env.js';
import logger from './config/logger.js';

class HttpServer {
  private readonly server: http.Server;

  constructor(private readonly expressApp = app) {
    this.server = http.createServer(this.expressApp);
  }

  async start(): Promise<void> {
    try {
      await database.connect();

      this.server.listen(env.PORT, () => {
        logger.info({ port: env.PORT }, 'DevLoopFeed API started');
      });
    } catch (error) {
      logger.error({ error }, 'Failed to start API server');
      process.exit(1);
    }
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const server = new HttpServer();
  void server.start();
}

export default HttpServer;

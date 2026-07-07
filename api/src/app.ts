import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import env from './config/env.js';
import requestLogger from './shared/middleware/requestLogger.js';
import errorHandler from './shared/middleware/errorHandler.js';
import notFoundHandler from './shared/middleware/notFoundHandler.js';
import healthRoutes from './modules/health/health.route.js';
import authRoutes from './modules/auth/auth.route.js';
import mediaRoutes from './modules/media/media.route.js';
import postRoutes from './modules/posts/post.route.js';
import reportRoutes from './modules/reports/report.route.js';
import userRoutes from './modules/users/user.route.js';

class App {
  private readonly app: Express;

  constructor() {
    this.app = express();
    this.registerGlobalMiddleware();
    this.registerRoutes();
    this.registerErrorMiddleware();
  }

  getInstance(): Express {
    return this.app;
  }

  private getCorsOrigins(): string[] | boolean {
    if (env.CORS_ORIGIN === '*') return true;

    return env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  private registerGlobalMiddleware(): void {
    this.app.disable('x-powered-by');
    this.app.use(requestLogger);
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: this.getCorsOrigins(),
        credentials: true,
      }),
    );
    this.app.use(express.json({ limit: '2mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '2mb' }));
    this.app.use(cookieParser());
  }

  private registerRoutes(): void {
    this.app.use('/api/health', healthRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/media', mediaRoutes);
    this.app.use('/api/post', postRoutes);
    this.app.use('/api/report', reportRoutes);
    this.app.use('/api/user', userRoutes);
  }

  private registerErrorMiddleware(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }
}

const appFactory = new App();

export { App };
export default appFactory.getInstance();
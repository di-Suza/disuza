import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import mediaController from './media.controller.js';

class MediaRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.get('/upload-auth', mediaController.getUploadAuth);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { MediaRoutes };
export default new MediaRoutes().getRouter();

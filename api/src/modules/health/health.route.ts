import { Router } from 'express';

import healthController from './health.controller.js';

class HealthRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.get('/', healthController.getHealth);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { HealthRoutes };
export default new HealthRoutes().getRouter();

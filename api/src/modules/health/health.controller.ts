import type { Request, Response } from 'express';

import healthService, { type HealthService } from './health.service.js';

class HealthController {
  constructor(private readonly service: HealthService = healthService) {
    this.getHealth = this.getHealth.bind(this);
  }

  getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: this.service.getHealth(),
    });
  }
}

const healthController = new HealthController();

export { HealthController };
export default healthController;

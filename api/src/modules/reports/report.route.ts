import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import reportController from './report.controller.js';
import { getMyReportsRules, reportRules } from './validators/report.validator.js';

class ReportRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.get('/my-reports', getMyReportsRules, validateRequest, reportController.getMyReports);
    this.router.post('/', reportRules, validateRequest, reportController.createReport);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { ReportRoutes };
export default new ReportRoutes().getRouter();
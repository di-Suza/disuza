import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import issueController from './issue.controller.js';
import { createIssueRules } from './validators/issue.validator.js';

class IssueRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.post('/', createIssueRules, validateRequest, issueController.createIssue);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { IssueRoutes };
export default new IssueRoutes().getRouter();

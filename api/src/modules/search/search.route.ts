import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import searchController from './search.controller.js';
import { discoverRules, searchRules } from './validators/search.validator.js';

class SearchRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.get('/discover', discoverRules, validateRequest, searchController.discover);
    this.router.get('/', searchRules, validateRequest, searchController.search);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { SearchRoutes };
export default new SearchRoutes().getRouter();

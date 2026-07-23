import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import { aiProblemRateLimiter } from '../../shared/middleware/rateLimiter.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import problemController from './problem.controller.js';
import {
  addProblemToRoomRules,
  generateAIProblemRules,
  removeProblemFromRoomRules,
  roomIdParamRules,
  runProblemRules,
  selectProblemRules,
  unselectProblemRules,
  updateProblemLanguageRules,
} from './validators/problem.validator.js';

class ProblemRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.post('/addProblemToRoom', addProblemToRoomRules, validateRequest, problemController.addProblemToRoom);
    this.router.patch('/selectProblem', selectProblemRules, validateRequest, problemController.selectProblem);
    this.router.patch('/unselectProblem', unselectProblemRules, validateRequest, problemController.unselectProblem);
    this.router.patch('/updateLanguage', updateProblemLanguageRules, validateRequest, problemController.updateProblemLanguage);
    this.router.delete('/removeProblemFromRoom', removeProblemFromRoomRules, validateRequest, problemController.removeProblemFromRoom);
    this.router.post('/run', runProblemRules, validateRequest, problemController.runProblem);
    this.router.post('/ai/generate', aiProblemRateLimiter, generateAIProblemRules, validateRequest, problemController.generateAIProblem);
    this.router.get('/:roomId', roomIdParamRules, validateRequest, problemController.searchProblem);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { ProblemRoutes };
export default new ProblemRoutes().getRouter();

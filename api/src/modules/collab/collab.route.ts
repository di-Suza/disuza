import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import collabController from './collab.controller.js';
import { conversationIdRules, roomIdRules } from './validators/collab.validator.js';

class CollabRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.get('/rooms', collabController.getMyRooms);
    this.router.post('/personal-room', collabController.getPersonalRoom);
    this.router.get('/status/:conversationId', conversationIdRules, validateRequest, collabController.getCollabStatus);
    this.router.post('/request/:conversationId', conversationIdRules, validateRequest, collabController.sendCollabRequest);
    this.router.post('/accept/:conversationId', conversationIdRules, validateRequest, collabController.acceptCollabRequest);
    this.router.get('/room/:roomId', roomIdRules, validateRequest, collabController.getCollabRoom);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { CollabRoutes };
export default new CollabRoutes().getRouter();

import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import notificationController from './notification.controller.js';
import { getNotificationRules, notificationIdParamRules } from './validators/notification.validator.js';

class NotificationRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.get('/getNotifications', getNotificationRules, validateRequest, notificationController.getNotifications);
    this.router.get('/getUnreadCount', notificationController.getUnreadCount);
    this.router.patch('/markAllAsRead', notificationController.markAllAsRead);
    this.router.delete('/deleteNotification/:notificationId', notificationIdParamRules, validateRequest, notificationController.deleteNotification);
    this.router.delete('/deleteAllNotifications', notificationController.deleteAllNotifications);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { NotificationRoutes };
export default new NotificationRoutes().getRouter();

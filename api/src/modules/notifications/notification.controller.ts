import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import notificationService, { type NotificationService } from './notification.service.js';

class NotificationController {
  readonly getNotifications: RequestHandler;
  readonly getUnreadCount: RequestHandler;
  readonly markAllAsRead: RequestHandler;
  readonly deleteNotification: RequestHandler;
  readonly deleteAllNotifications: RequestHandler;

  constructor(private readonly service: NotificationService = notificationService) {
    this.getNotifications = asyncHandler(this.handleGetNotifications.bind(this));
    this.getUnreadCount = asyncHandler(this.handleGetUnreadCount.bind(this));
    this.markAllAsRead = asyncHandler(this.handleMarkAllAsRead.bind(this));
    this.deleteNotification = asyncHandler(this.handleDeleteNotification.bind(this));
    this.deleteAllNotifications = asyncHandler(this.handleDeleteAllNotifications.bind(this));
  }

  private async handleGetNotifications(req: Request, res: Response) {
    const result = await this.service.getNotifications(req.user!.id, req.query.page, req.query.limit);

    res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      ...result,
    });
  }

  private async handleGetUnreadCount(req: Request, res: Response) {
    const unreadCount = await this.service.getUnreadCount(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Unread notifications count fetched successfully',
      unreadCount,
    });
  }

  private async handleMarkAllAsRead(req: Request, res: Response) {
    await this.service.markAllAsRead(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  }

  private async handleDeleteNotification(req: Request, res: Response) {
    await this.service.deleteNotification(req.user!.id, String(req.params.notificationId));

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  }

  private async handleDeleteAllNotifications(req: Request, res: Response) {
    await this.service.deleteAllNotifications(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'All notifications deleted successfully',
    });
  }
}

const notificationController = new NotificationController();

export { NotificationController };
export default notificationController;

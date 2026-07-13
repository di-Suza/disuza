import type { Types } from 'mongoose';

import realtimeService, { type RealtimeService } from '../../infrastructure/realtime/realtime.service.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import notificationRepository, { type NotificationFilter, type NotificationRepository } from './notification.repository.js';
import { type NotificationTargetModel, type NotificationType } from './notification.model.js';

const COLLAB_REQUEST_NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const CONTENT_BACKED_TYPES: NotificationType[] = ['LIKE', 'COMMENT', 'COMMENT_REPLY', 'COLLAB_REQUEST', 'COLLAB_ACCEPTED'];

type SendNotificationInput = {
  senderId: string | Types.ObjectId;
  recipientId: string | Types.ObjectId;
  type: NotificationType;
  contentId?: string | Types.ObjectId;
  onModel?: NotificationTargetModel;
};

type RemoveNotificationInput = {
  senderId: string | Types.ObjectId;
  recipientId: string | Types.ObjectId;
  type: NotificationType;
  contentId?: string | Types.ObjectId;
};

class NotificationService {
  constructor(
    private readonly notifications: NotificationRepository = notificationRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly realtime: RealtimeService = realtimeService,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown): number {
    const limit = Number(limitInput) || 10;
    return Math.min(Math.max(limit, 1), 20);
  }

  private shouldHideMissingContent(type: NotificationType, contentId: unknown) {
    return CONTENT_BACKED_TYPES.includes(type) && !contentId;
  }

  private sanitizeNotification<T extends { type: NotificationType; contentId?: unknown; onModel?: NotificationTargetModel }>(notification: T): T {
    if (notification.onModel === 'User') {
      return { ...notification, contentId: undefined };
    }

    return notification;
  }

  async getNotifications(userId: string, pageInput: unknown, limitInput: unknown) {
    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(userId);
    const notifications = await this.notifications.findByRecipient(userId, blockedUserIds, page, limit);
    const orphanNotificationIds = notifications
      .filter((notification) => this.shouldHideMissingContent(notification.type, notification.contentId))
      .map((notification) => notification._id);

    if (orphanNotificationIds.length > 0) {
      await this.notifications.deleteManyByIds(orphanNotificationIds);
    }

    const cleanedNotifications = notifications
      .filter((notification) => !this.shouldHideMissingContent(notification.type, notification.contentId))
      .map((notification) => this.sanitizeNotification(notification));
    const unreadCount = await this.notifications.countUnreadByRecipient(userId, blockedUserIds);

    return {
      notifications: cleanedNotifications,
      unreadCount,
      currentPage: page,
      hasMore: cleanedNotifications.length === limit,
    };
  }

  async markAllAsRead(userId: string) {
    await this.notifications.markAllRead(userId);
  }

  async deleteNotification(userId: string, notificationId: string) {
    const deletedNotification = await this.notifications.deleteOwnedById(notificationId, userId);

    if (deletedNotification) {
      this.realtime.emitToUser(userId, 'delete_notification', {
        notificationId: deletedNotification._id.toString(),
      });
    }
  }

  async deleteAllNotifications(userId: string) {
    await this.notifications.deleteAllByRecipient(userId);
  }

  async send(input: SendNotificationInput) {
    if (input.senderId.toString() === input.recipientId.toString()) return null;

    const blockStatus = await this.blockRules.getBlockStatus(input.senderId, input.recipientId);

    if (blockStatus.block) return null;

    const expiresAt = input.type === 'COLLAB_REQUEST'
      ? new Date(Date.now() + COLLAB_REQUEST_NOTIFICATION_TTL_MS)
      : null;

    const notification = await this.notifications.create({
      sender: input.senderId,
      recipient: input.recipientId,
      type: input.type,
      contentId: input.contentId,
      onModel: input.onModel,
      expiresAt,
    });

    const populatedNotification = await this.notifications.findPopulatedById(notification._id);
    const emittedNotification = populatedNotification ? this.sanitizeNotification(populatedNotification) : notification;

    this.realtime.emitToUser(input.recipientId.toString(), 'new_notification', emittedNotification);

    return emittedNotification;
  }

  async remove(input: RemoveNotificationInput) {
    const deletedNotification = await this.notifications.deleteByFilter({
      sender: input.senderId,
      recipient: input.recipientId,
      type: input.type,
      contentId: input.contentId,
    });

    if (deletedNotification) {
      this.realtime.emitToUser(input.recipientId.toString(), 'delete_notification', {
        notificationId: deletedNotification._id.toString(),
      });
    }

    return deletedNotification;
  }

  async removeManyForContent(contentIds: Array<string | Types.ObjectId>, types?: NotificationType[]) {
    if (contentIds.length === 0) return null;
    return this.notifications.deleteManyByContent({ contentIds, types });
  }

  findOne(filter: NotificationFilter) {
    return this.notifications.findOne(filter);
  }
}

const notificationService = new NotificationService();

export { NotificationService, type RemoveNotificationInput, type SendNotificationInput };
export default notificationService;

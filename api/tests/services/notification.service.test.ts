import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotificationService } from '../../src/modules/notifications/notification.service.js';
import { conversationId, oid, otherUserId, postId, userId } from '../helpers/domain.js';

describe('NotificationService', () => {
  it('cleans orphan notifications while returning unread counts', async () => {
    const notificationId = oid('507f1f77bcf86cd799439021');
    const deletedIds: unknown[] = [];
    const service = new NotificationService({
      findByRecipient: async () => [
        { _id: notificationId, type: 'LIKE', contentId: null },
        { _id: oid('507f1f77bcf86cd799439022'), type: 'GROUP_INVITE', contentId: oid(conversationId), onModel: 'User' },
      ],
      deleteManyByIds: async (ids: unknown[]) => deletedIds.push(...ids),
      countUnreadByRecipient: async () => 3,
    } as never, {
      getBlockedUserIds: async () => [],
    } as never, {} as never);

    const result = await service.getNotifications(userId, '-1', '99');

    assert.equal(result.unreadCount, 3);
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0].contentId, undefined);
    assert.deepEqual(deletedIds, [notificationId]);
    assert.equal(await service.getUnreadCount(userId), 3);
  });

  it('skips self and blocked notifications, emits creates/deletes, and removes content notifications', async () => {
    const emitted: unknown[] = [];
    const notificationId = oid('507f1f77bcf86cd799439021');
    const service = new NotificationService({
      markAllRead: async () => undefined,
      deleteOwnedById: async () => ({ _id: notificationId }),
      deleteAllByRecipient: async () => undefined,
      create: async (input: Record<string, unknown>) => ({ _id: notificationId, ...input }),
      findPopulatedById: async () => null,
      deleteByFilter: async () => ({ _id: notificationId, recipient: oid(otherUserId) }),
      findManyByContent: async () => [{ _id: notificationId, recipient: oid(otherUserId) }],
      deleteManyByIds: async (ids: unknown[]) => ({ deletedCount: ids.length }),
    } as never, {
      getBlockStatus: async () => ({ block: null }),
    } as never, {
      emitToUser: (...input: unknown[]) => emitted.push(input),
    } as never);

    assert.equal(await service.send({ senderId: userId, recipientId: userId, type: 'LIKE', contentId: postId, onModel: 'Post' }), null);
    assert.ok(await service.send({ senderId: userId, recipientId: otherUserId, type: 'LIKE', contentId: postId, onModel: 'Post' }));
    await service.markAllAsRead(userId);
    await service.deleteNotification(userId, notificationId.toString());
    await service.deleteAllNotifications(userId);
    await service.remove({ senderId: userId, recipientId: otherUserId, type: 'LIKE', contentId: postId });
    await service.removeManyForContent([postId], ['LIKE']);
    assert.ok(emitted.length >= 4);

    const blockedService = new NotificationService({} as never, {
      getBlockStatus: async () => ({ block: { _id: oid(postId) } }),
    } as never, {} as never);
    assert.equal(await blockedService.send({ senderId: userId, recipientId: otherUserId, type: 'LIKE' }), null);
  });
});

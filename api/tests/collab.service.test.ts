import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CollabRoomAccessService } from '../src/modules/collab/collabRoomAccess.service.js';
import { CollabService } from '../src/modules/collab/collab.service.js';
import { ForbiddenError } from '../src/shared/errors/index.js';
import { conversationId, oid, otherUserId, roomId, userId } from './helpers/domain.js';

describe('CollabService', () => {
  it('creates direct collab requests and notifications', async () => {
    const notifications: unknown[] = [];
    const service = new CollabService({
      findConversationById: async () => ({ _id: oid(conversationId), participants: [oid(userId), oid(otherUserId)], hiddenBy: [], isGroup: false }),
      findRoomByConversation: async () => null,
      findRequestByConversation: async () => null,
      createRequest: async () => ({ _id: oid('507f1f77bcf86cd799439026'), sender: oid(userId), recipient: oid(otherUserId) }),
    } as never, {
      send: async (input: unknown) => notifications.push(input),
    } as never, {
      getBlockStatus: async () => ({ block: null }),
      ensureUsersCanInteract: async () => undefined,
    } as never, {} as never);

    const request = await service.sendCollabRequest(userId, conversationId);

    assert.equal(request.sender.toString(), userId);
    assert.equal(notifications.length, 1);
  });

  it('treats group rooms as accepted and creates rooms when direct requests are accepted', async () => {
    const notifications: unknown[] = [];
    const baseRepository = {
      findConversationById: async () => ({ _id: oid(conversationId), participants: [oid(userId), oid(otherUserId)], hiddenBy: [], isGroup: true }),
      findRoomByConversation: async () => null,
      findRequestByConversation: async () => ({ _id: oid('507f1f77bcf86cd799439026'), sender: oid(userId), recipient: oid(otherUserId) }),
      createSharedRoom: async () => ({ _id: oid(roomId), conversationId: oid(conversationId) }),
      deleteRequestById: async () => undefined,
    };
    const groupService = new CollabService(baseRepository as never, {} as never, {
      getBlockStatus: async () => ({ block: null }),
      ensureUsersCanInteract: async () => undefined,
    } as never, {} as never);
    const groupStatus = await groupService.checkCollabRequestStatus(userId, conversationId);
    assert.equal(groupStatus.status, 'accepted');

    const acceptService = new CollabService({
      ...baseRepository,
      findConversationById: async () => ({ _id: oid(conversationId), participants: [oid(userId), oid(otherUserId)], hiddenBy: [], isGroup: false }),
    } as never, {
      send: async (input: unknown) => notifications.push(input),
      remove: async (input: unknown) => notifications.push(input),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {} as never);
    const room = await acceptService.acceptCollabRequest(otherUserId, conversationId);

    assert.equal(room._id.toString(), roomId);
    assert.ok(notifications.length >= 1);
  });

  it('protects hidden conversations and non-member rooms', async () => {
    const hiddenService = new CollabService({
      findConversationById: async () => ({ _id: oid(conversationId), participants: [oid(userId), oid(otherUserId)], hiddenBy: [oid(userId)], isGroup: false }),
    } as never, {} as never, {} as never, {} as never);
    await assert.rejects(() => hiddenService.checkCollabRequestStatus(userId, conversationId), ForbiddenError);

    const access = new CollabRoomAccessService({
      findRoomById: async () => ({ _id: oid(roomId), roomType: 'shared', conversationId: oid(conversationId) }),
      findConversationById: async () => ({ _id: oid(conversationId), participants: [oid(otherUserId)], hiddenBy: [], isGroup: false }),
    } as never, {
      getBlockStatus: async () => ({ block: null }),
    } as never);
    await assert.rejects(() => access.getRoomAccess(userId, roomId), ForbiddenError);
  });
});

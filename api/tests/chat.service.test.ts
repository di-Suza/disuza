import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ChatService } from '../src/modules/chat/chat.service.js';
import { BadRequestError, ForbiddenError } from '../src/shared/errors/index.js';
import { conversationId, createConversation, oid, otherUserId, postId, userId } from './helpers/domain.js';

describe('ChatService', () => {
  it('formats conversations with participants, unread counts, and pin state', async () => {
    const service = new ChatService({
      getConversations: async () => [{
        _id: oid(conversationId),
        isGroup: true,
        participantsInfo: [{ _id: oid(userId) }, { _id: oid(otherUserId) }],
        participants: [oid(userId), oid(otherUserId)],
        hiddenBy: [oid(otherUserId)],
        admins: [oid(userId)],
        unreadCount: 2,
        isPinned: true,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }],
      findConversationForUser: async () => createConversation(),
      setPinnedForUser: async () => ({ _id: oid(conversationId) }),
    } as never, {} as never, {} as never, {} as never, {
      getOnlineUserIds: async () => [otherUserId],
    } as never, {} as never, {} as never, {} as never, {} as never);

    const conversations = await service.getConversations(userId);
    assert.equal(conversations[0].participants.length, 1);
    assert.equal(conversations[0].unreadCount, 2);

    const pinned = await service.setConversationPinned(userId, conversationId, true);
    assert.equal(pinned.conversation?._id.toString(), conversationId);
  });

  it('paginates messages, marks read state, and emits seen receipts', async () => {
    const emitted: unknown[] = [];
    const service = new ChatService({
      findConversationForUser: async () => createConversation({ isGroup: true }),
      getMessages: async () => [{ _id: oid('507f1f77bcf86cd799439030') }],
      enrichFeedbackMessages: async (messages: unknown[]) => messages,
      findMessageById: async () => ({ _id: oid(postId), sender: oid(otherUserId) }),
      markMessagesSeen: async () => ({ count: 1, seenAt: new Date('2026-01-01T00:00:00.000Z') }),
    } as never, {} as never, {} as never, {} as never, {
      emitToUser: (...input: unknown[]) => emitted.push(input),
      getOnlineUserIds: async () => [otherUserId],
    } as never, {} as never, {} as never, {} as never, {} as never);

    const messages = await service.getMessages(conversationId, userId, '-1', '1');
    assert.equal(messages.currentPage, 1);
    assert.equal(messages.hasMore, true);

    const read = await service.markAsRead(conversationId, userId);
    assert.equal(read.unreadCount, 0);
    assert.equal(read.seenCount, 1);
    assert.equal(emitted.length, 1);
  });

  it('unsends messages, blocks unsafe group deletes, and cleans up empty groups', async () => {
    const cleanupJobs: unknown[] = [];
    const conversation = createConversation({ isGroup: true, participants: [oid(userId), oid(otherUserId)], admins: [oid(userId)] });
    const service = new ChatService({
      findConversationForUser: async () => conversation,
      findMessageById: async () => ({
        _id: oid(postId),
        sender: oid(userId),
        conversationId: oid(conversationId),
      }),
      deleteMessage: async () => undefined,
      findLatestMessage: async () => null,
    } as never, {} as never, {} as never, {
      removeContribution: async () => null,
    } as never, {
      emitToUser: () => undefined,
    } as never, {} as never, {} as never, {} as never, {
      enqueueConversationCleanup: async (input: unknown) => cleanupJobs.push(input),
    } as never);

    const unsent = await service.unsendMessage(postId, userId);
    assert.equal(unsent.wasLastMessage, true);

    await assert.rejects(() => service.deleteConversationForUser(conversationId, userId), BadRequestError);
    conversation.participants = [oid(userId)];
    const deleted = await service.deleteConversationForUser(conversationId, userId);
    assert.equal(deleted.deletedGroup, true);
    assert.equal(cleanupJobs.length, 1);
  });

  it('allows authorized attachment access and rejects forbidden attachments', async () => {
    const service = new ChatService({
      findMessageForAttachment: async () => ({
        attachment: { url: 'https://files.example/a.txt', mime: 'text/plain', name: 'a.txt' },
        conversationId: oid(conversationId),
      }),
      findConversationForUser: async () => createConversation(),
    } as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

    const attachment = await service.getAttachmentAccess(userId, postId, 'file-1');
    assert.equal(attachment.mime, 'text/plain');

    const forbiddenAttachmentService = new ChatService({
      findMessageForAttachment: async () => ({ attachment: { url: 'https://files.example/a.txt' }, conversationId: oid(conversationId) }),
      findConversationForUser: async () => null,
    } as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await assert.rejects(() => forbiddenAttachmentService.getAttachmentAccess(userId, postId, 'file-1'), ForbiddenError);
  });
});

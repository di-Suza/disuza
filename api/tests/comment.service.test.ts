import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CommentService } from '../src/modules/comments/comment.service.js';
import { BadRequestError } from '../src/shared/errors/index.js';
import { oid, otherUserId, postId, thirdUserId, userId } from './helpers/domain.js';

describe('CommentService', () => {
  it('creates comments and replies with notifications and contribution updates', async () => {
    const commentObjectId = oid('507f1f77bcf86cd799439019');
    const replyObjectId = oid('507f1f77bcf86cd799439020');
    const notifications: unknown[] = [];
    const heatmapUpdates: unknown[] = [];
    const service = new CommentService({
      findTopLevelById: async () => ({ _id: commentObjectId, user: oid(thirdUserId), post: oid(postId), postOwner: oid(otherUserId) }),
      create: async (input: Record<string, unknown>) => ({ _id: replyObjectId, ...input }),
      populateAuthor: async (comment: unknown) => comment,
      incrementReplyCount: async () => undefined,
    } as never, {
      findVisibleCommentTarget: async () => ({ _id: oid(postId), user: oid(otherUserId), settings: { commentsDisabled: false } }),
      incrementCommentsCount: async () => undefined,
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      send: async (input: unknown) => notifications.push(input),
    } as never, {
      updateContribution: async (...input: unknown[]) => heatmapUpdates.push(input),
    } as never);

    await assert.rejects(() => service.createComment(userId, { postId, comment: '   ' }), BadRequestError);
    const comment = await service.createComment(userId, { postId, comment: '  Thanks  ', parentCommentId: commentObjectId.toString() });

    assert.equal(comment.comment, 'Thanks');
    assert.equal(notifications.length, 1);
    assert.equal(heatmapUpdates.length, 1);
  });

  it('paginates top-level comments and replies with bounded defaults', async () => {
    const commentObjectId = oid('507f1f77bcf86cd799439019');
    const replyObjectId = oid('507f1f77bcf86cd799439020');
    const service = new CommentService({
      findTopLevelById: async () => ({ _id: commentObjectId, post: oid(postId), postOwner: oid(otherUserId), user: oid(thirdUserId) }),
      getTopLevelComments: async () => [{ _id: commentObjectId }],
      getReplies: async () => [{ _id: replyObjectId }],
    } as never, {
      findVisibleCommentTarget: async () => ({ _id: oid(postId), user: oid(otherUserId), settings: { commentsDisabled: false } }),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
      getBlockedUserIds: async () => [],
    } as never, {} as never, {} as never);

    const allComments = await service.getAllComments(postId, '-1', '99', userId);
    assert.equal(allComments.currentPage, 1);
    assert.equal(allComments.hasMore, false);

    const replies = await service.getReplies(commentObjectId.toString(), '2', '1', userId);
    assert.equal(replies.currentPage, 2);
    assert.equal(replies.hasMore, true);
  });

  it('deletes comment threads and rejects disabled-comment posts', async () => {
    const commentObjectId = oid('507f1f77bcf86cd799439019');
    const replyObjectId = oid('507f1f77bcf86cd799439020');
    const service = new CommentService({
      findByIdAndPost: async () => ({ _id: commentObjectId, user: oid(userId), postOwner: oid(otherUserId), parentComment: null }),
      findReplies: async () => [{ _id: replyObjectId, user: oid(thirdUserId) }],
      deleteMany: async () => ({ deletedCount: 2 }),
    } as never, {
      incrementCommentsCount: async () => undefined,
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      removeManyForContent: async () => undefined,
    } as never, {
      removeContribution: async () => undefined,
    } as never);

    const deleteResult = await service.deleteComment(userId, postId, commentObjectId.toString());
    assert.equal(deleteResult.deletedCount, 2);

    const disabledService = new CommentService({} as never, {
      findVisibleCommentTarget: async () => ({ _id: oid(postId), user: oid(otherUserId), settings: { commentsDisabled: true } }),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {} as never, {} as never);
    await assert.rejects(() => disabledService.createComment(userId, { postId, comment: 'Nope' }), BadRequestError);
  });
});

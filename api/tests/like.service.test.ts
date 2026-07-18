import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LikeService } from '../src/modules/likes/like.service.js';
import { NotFoundError } from '../src/shared/errors/index.js';
import { oid, otherUserId, postId, userId } from './helpers/domain.js';

describe('LikeService', () => {
  it('handles idempotent likes and unlikes without duplicate notifications', async () => {
    const sentNotifications: unknown[] = [];
    const removedNotifications: unknown[] = [];
    const service = new LikeService({
      createOnce: async () => ({ created: false }),
      deleteOne: async () => ({ deleted: false }),
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
      incrementLikesCount: async () => ({ _id: oid(postId) }),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      send: async (input: unknown) => sentNotifications.push(input),
      remove: async (input: unknown) => removedNotifications.push(input),
    } as never);

    assert.deepEqual(await service.likePost(userId, postId), { liked: true, alreadyLiked: true });
    assert.deepEqual(await service.unlikePost(userId, postId), { liked: false, alreadyUnliked: true });
    assert.equal(sentNotifications.length, 0);
    assert.equal(removedNotifications.length, 0);
  });

  it('sends and removes owner notifications around successful like lifecycle', async () => {
    const sentNotifications: unknown[] = [];
    const removedNotifications: unknown[] = [];
    const service = new LikeService({
      createOnce: async () => ({ created: true }),
      deleteOne: async () => ({ deleted: true }),
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
      incrementLikesCount: async () => ({ _id: oid(postId) }),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      send: async (input: unknown) => sentNotifications.push(input),
      remove: async (input: unknown) => removedNotifications.push(input),
    } as never);

    assert.deepEqual(await service.likePost(userId, postId), { liked: true, alreadyLiked: false });
    assert.deepEqual(await service.unlikePost(userId, postId), { liked: false, alreadyUnliked: false });
    assert.equal(sentNotifications.length, 1);
    assert.equal(removedNotifications.length, 1);
  });

  it('rolls back inserted likes when post counters cannot be updated', async () => {
    const deletedLikes: unknown[] = [];
    const service = new LikeService({
      createOnce: async () => ({ created: true }),
      deleteOne: async (likerId: string, targetPostId: string) => deletedLikes.push({ likerId, targetPostId }),
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
      incrementLikesCount: async () => null,
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      send: async () => undefined,
    } as never);

    await assert.rejects(() => service.likePost(userId, postId), NotFoundError);
    assert.deepEqual(deletedLikes, [{ likerId: userId, targetPostId: postId }]);
  });
});

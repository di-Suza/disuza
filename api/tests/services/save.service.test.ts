import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SaveService } from '../../src/modules/saves/save.service.js';
import { BadRequestError, ConflictError } from '../../src/shared/errors/index.js';
import { oid, otherUserId, postId, userId } from '../helpers/domain.js';

describe('SaveService', () => {
  it('saves, moves, unsaves posts, and refreshes collection cover state', async () => {
    const collectionId = oid('507f1f77bcf86cd799439023');
    const sourceCollectionId = oid('507f1f77bcf86cd799439024');
    const selectedCalls: unknown[] = [];
    const service = new SaveService({
      findByUserAndPost: async () => ({ _id: oid('507f1f77bcf86cd799439025'), collectionId: sourceCollectionId }),
      updateCollection: async (...input: unknown[]) => selectedCalls.push(input),
      findLatestInCollection: async () => null,
      deleteByUserAndPost: async () => ({ collectionId }),
    } as never, {
      findOwnedById: async () => ({ _id: collectionId, name: 'Work', selected: true, isSystemGenerated: false }),
      findSelected: async () => ({ _id: collectionId, name: 'Work', selected: true, isSystemGenerated: false }),
      selectOnly: async (...input: unknown[]) => selectedCalls.push(input),
      updateCover: async () => undefined,
    } as never, {
      findVisibleSaveTarget: async () => ({ _id: oid(postId), user: oid(otherUserId), media: [{ url: 'cover.jpg' }] }),
      findVisibleCoverMedia: async () => ({ media: [{ url: 'next.jpg' }] }),
    } as never, {} as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never);

    const saveResult = await service.savePost(userId, { postId, collectionId: collectionId.toString() });
    assert.equal(saveResult.saved, true);
    assert.equal(selectedCalls.length, 1);

    const unsaveResult = await service.unsavePost(userId, postId);
    assert.equal(unsaveResult.saved, false);
  });

  it('manages collections and saved-post listing viewer state', async () => {
    const collectionId = oid('507f1f77bcf86cd799439023');
    const service = new SaveService({
      countVisibleByCollections: async () => [{ _id: collectionId, postsCount: 2 }],
      findVisibleCollectionPosts: async () => [[{
        post: { _id: oid(postId), caption: 'Saved post' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }], [{ totalPosts: 1 }]],
    } as never, {
      ensureDefaultCollection: async () => ({
        _id: collectionId,
        name: 'Default',
        selected: true,
        toObject: () => ({ _id: collectionId, name: 'Default' }),
      }),
      findAllByOwner: async () => [{ _id: collectionId, name: 'Work' }],
      clearSelected: async () => undefined,
      create: async () => {
        throw { code: 11000 };
      },
      findOwnedById: async () => ({ _id: collectionId, name: 'Work', selected: true, isSystemGenerated: false }),
      updateName: async () => {
        throw { code: 11000 };
      },
      findOwnedByIdLean: async () => ({ _id: collectionId, name: 'Work' }),
    } as never, {} as never, {
      findLikedPostIds: async () => new Set([postId]),
    } as never, {
      getBlockedUserIds: async () => [],
    } as never);

    const collections = await service.getSavedPostsCollections(userId);
    assert.equal(collections[0].postsCount, 2);

    await assert.rejects(() => service.createCollection(userId, { name: ' Work ' }), ConflictError);
    await assert.rejects(() => service.updateCollection(userId, collectionId.toString(), { name: ' Work ' }), ConflictError);

    const posts = await service.getSavedCollectionPosts(userId, collectionId.toString(), '1', '12');
    assert.equal(posts.posts[0].isLiked, true);
    assert.equal(posts.posts[0].isSaved, true);
  });

  it('protects system generated collections from deletion', async () => {
    const collectionId = oid('507f1f77bcf86cd799439023');
    const service = new SaveService({} as never, {
      findOwnedById: async () => ({ _id: collectionId, isSystemGenerated: true }),
    } as never, {} as never, {} as never, {} as never);

    await assert.rejects(() => service.deleteCollection(userId, collectionId.toString()), BadRequestError);
  });
});

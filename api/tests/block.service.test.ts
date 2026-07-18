import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BlockService } from '../src/modules/users/block/block.service.js';
import { BadRequestError, ForbiddenError } from '../src/shared/errors/index.js';
import { oid, otherUserId, thirdUserId, userId } from './helpers/domain.js';

describe('BlockService', () => {
  it('returns neutral block status when either user id is missing', async () => {
    const service = new BlockService({} as never);

    assert.deepEqual(await service.getBlockStatus(null, otherUserId), {
      isBlocked: false,
      hasBlockedMe: false,
      block: null,
    });
  });

  it('detects outgoing and incoming blocks and prevents interactions', async () => {
    const outgoing = new BlockService({
      findBetweenUsers: async () => ({ blocker: oid(userId), blockedUser: oid(otherUserId) }),
    } as never);

    const outgoingStatus = await outgoing.getBlockStatus(userId, otherUserId);
    assert.equal(outgoingStatus.isBlocked, true);
    await assert.rejects(() => outgoing.ensureUsersCanInteract(userId, otherUserId, 'message'), ForbiddenError);

    const incoming = new BlockService({
      findBetweenUsers: async () => ({ blocker: oid(otherUserId), blockedUser: oid(userId) }),
    } as never);
    const incomingStatus = await incoming.getBlockStatus(userId, otherUserId);
    assert.equal(incomingStatus.hasBlockedMe, true);
    await assert.rejects(() => incoming.ensureUsersCanInteract(userId, otherUserId, 'message'), ForbiddenError);
  });

  it('returns both sides of block relations for filtering', async () => {
    const service = new BlockService({
      findRelationsForUser: async () => [
        { blocker: oid(userId), blockedUser: oid(otherUserId) },
        { blocker: oid(thirdUserId), blockedUser: oid(userId) },
      ],
    } as never);

    const blockedIds = await service.getBlockedUserIds(userId);

    assert.deepEqual(blockedIds.map((id) => id.toString()), [otherUserId, thirdUserId]);
    await assert.rejects(() => service.ensureUsersCanInteract(userId, ''), BadRequestError);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ReportService } from '../src/modules/reports/report.service.js';
import { BadRequestError, ConflictError, ForbiddenError } from '../src/shared/errors/index.js';
import { conversationId, oid, otherUserId, postId, userId } from './helpers/domain.js';

describe('ReportService', () => {
  it('validates post, user, and message report targets before creating reports', async () => {
    const reports: unknown[] = [];
    const service = new ReportService({
      findExisting: async () => null,
      create: async (input: unknown) => {
        reports.push(input);
        return input;
      },
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
    } as never, {
      findById: async (id: string) => ({ _id: oid(id) }),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      findMessageById: async () => ({ _id: oid(postId), sender: oid(otherUserId), conversationId: oid(conversationId) }),
      findConversationByParticipant: async () => ({ _id: oid(conversationId) }),
    } as never);

    await assert.rejects(() => service.createReport(userId, { targetId: postId, onModel: 'Bad' as never, reason: 'Spam', description: 'x' }), BadRequestError);
    await assert.rejects(() => service.createReport(userId, { targetId: userId, onModel: 'User', reason: 'Spam', description: 'x' }), BadRequestError);

    const report = await service.createReport(userId, { targetId: postId, onModel: 'Post', reason: 'Spam', description: '  bad  ' });
    assert.equal((report as { description: string }).description, 'bad');
    assert.equal(reports.length, 1);
  });

  it('paginates my reports and rejects duplicate or inaccessible reports', async () => {
    const pagedService = new ReportService({
      findExisting: async () => null,
      findByReporter: async () => [{ _id: oid(postId) }],
      countByReporter: async () => 2,
    } as never, {} as never, {} as never, {} as never, {} as never);
    const paged = await pagedService.getMyReports(userId, '-1', '99');
    assert.equal(paged.page, 1);
    assert.equal(paged.hasMore, true);

    const duplicateService = new ReportService({
      findExisting: async () => ({ _id: oid(postId) }),
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
    } as never, {} as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {} as never);
    await assert.rejects(() => duplicateService.createReport(userId, { targetId: postId, onModel: 'Post', reason: 'Spam', description: 'x' }), ConflictError);

    const forbiddenMessageService = new ReportService({} as never, {} as never, {} as never, {} as never, {
      findMessageById: async () => ({ _id: oid(postId), sender: oid(otherUserId), conversationId: oid(conversationId) }),
      findConversationByParticipant: async () => null,
    } as never);
    await assert.rejects(() => forbiddenMessageService.createReport(userId, { targetId: postId, onModel: 'Message', reason: 'Spam', description: 'x' }), ForbiddenError);
  });
});

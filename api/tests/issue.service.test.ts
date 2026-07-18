import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ISSUE_SUBMISSION_COOLDOWN_MS, IssueService } from '../src/modules/issues/issue.service.js';
import { BadRequestError, TooManyRequestsError } from '../src/shared/errors/index.js';
import { userId } from './helpers/domain.js';

describe('IssueService', () => {
  it('creates issues with default category and trimmed description', async () => {
    const createdIssues: unknown[] = [];
    const service = new IssueService({
      findLatestByReporter: async () => null,
      create: async (input: unknown) => {
        createdIssues.push(input);
        return input;
      },
    } as never);

    const result = await service.createIssue(userId, { description: '  Something broke  ' });

    assert.equal(result.message, 'Bug Report Submitted Successfully!');
    assert.deepEqual(createdIssues, [{ reporter: userId, category: 'Bug', description: 'Something broke' }]);
  });

  it('rejects invalid categories and repeated cooldown-window submissions', async () => {
    const service = new IssueService({
      findLatestByReporter: async () => null,
      create: async () => undefined,
    } as never);
    await assert.rejects(() => service.createIssue(userId, { category: 'Unknown' as never, description: 'x' }), BadRequestError);

    const lockedService = new IssueService({
      findLatestByReporter: async () => ({ createdAt: new Date(Date.now() - ISSUE_SUBMISSION_COOLDOWN_MS + 1000) }),
      create: async () => undefined,
    } as never);
    await assert.rejects(() => lockedService.createIssue(userId, { description: 'Again' }), TooManyRequestsError);
  });
});

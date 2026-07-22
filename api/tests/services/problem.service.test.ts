import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ProblemService } from '../../src/modules/problems/problem.service.js';
import { BadRequestError, ConflictError } from '../../src/shared/errors/index.js';
import { oid, problemId, roomId, roomProblemId, toObjectDocument, userId } from '../helpers/domain.js';

describe('ProblemService', () => {
  it('searches problems and annotates whether each problem is already added to the room', async () => {
    const service = new ProblemService({
      searchProblems: async () => [toObjectDocument({ _id: oid(problemId), title: 'Two Sum' })],
      existsInRoom: async () => true,
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {} as never, {} as never);

    const problems = await service.searchProblem('two', '-1', '99', roomId, userId);

    assert.equal(problems[0].isAdded, true);
  });

  it('separates manual and AI-generated problem search filters', async () => {
    const filters: unknown[] = [];
    const service = new ProblemService({
      searchProblems: async (filter: unknown) => {
        filters.push(filter);
        return [];
      },
      existsInRoom: async () => false,
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {} as never, {} as never);

    await service.searchProblem('', '1', '8', roomId, userId);
    await service.searchProblem('graph', '1', '8', roomId, userId, 'ai');
    await service.searchProblem('all', '1', '8', roomId, userId, 'all');

    assert.deepEqual(filters[0], { isAIGenerated: false });
    assert.equal((filters[1] as { isAIGenerated: boolean }).isAIGenerated, true);
    assert.equal((filters[1] as { $or: unknown[] }).$or.length, 2);
    assert.equal((filters[2] as { isAIGenerated?: boolean }).isAIGenerated, undefined);
  });

  it('generates and saves AI problems after room access passes', async () => {
    const generatedProblem = {
      title: 'Custom Sliding Window Challenge',
      description: 'Find the longest valid window in an array while respecting a generated constraint.',
      difficulty: 'Medium' as const,
      tags: ['Sliding Window', 'Array'],
      constraints: ['1 <= n <= 100000'],
      testCases: [
        { input: 'nums=[1,2,3], limit=3', expectedOutput: '2', isHidden: false },
        { input: 'nums=[4,1,1], limit=2', expectedOutput: '2', isHidden: true },
      ],
      boilerplate: {
        javascript: 'function solution(nums, limit) {\n  return 0;\n}',
        python: 'def solution(nums, limit):\n    return 0',
        cpp: 'int main() { return 0; }',
      },
    };
    const createdProblem = { _id: oid(problemId), ...generatedProblem, isAIGenerated: true };
    let createdWith: unknown = null;
    const service = new ProblemService({
      findAIGeneratedProblemByTitle: async () => null,
      createProblem: async (data: unknown) => {
        createdWith = data;
        return createdProblem;
      },
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {} as never, {} as never, {
      generateProblem: async () => generatedProblem,
    } as never);

    const problem = await service.generateAIProblem(userId, roomId, 'Make a medium sliding window problem');

    assert.equal(problem.isAIGenerated, true);
    assert.equal((createdWith as { isAIGenerated: boolean }).isAIGenerated, true);
  });

  it('adds, selects, unselects, and changes room problem language with realtime access status', async () => {
    const roomProblem = {
      _id: oid(roomProblemId),
      status: 'pending' as const,
      executionStatus: 'idle' as const,
      executionStartedAt: null,
      executionRequestedBy: null,
      currentCode: '',
      language: 'javascript' as const,
      testCasesPassed: 0,
      problemId: { _id: oid(problemId), testCases: [] },
      async save() {
        return this;
      },
      async populate() {
        return this;
      },
    };
    const collabRoom = {
      _id: oid(roomId),
      currentlySelectedProblem: null,
      async save() {
        return this;
      },
    };
    const service = new ProblemService({
      findProblemById: async () => ({ _id: oid(problemId), boilerplate: { javascript: 'function solve() {}' } }),
      findRoomProblem: async () => null,
      createRoomProblem: async () => roomProblem,
      findCollabRoomById: async () => collabRoom,
      findRunningRoomProblem: async () => null,
      findRoomProblemById: () => ({
        then: (resolve: (value: typeof roomProblem) => void) => resolve(roomProblem),
        populate: async () => roomProblem,
      }),
      updateAttemptedProblem: async () => null,
      updateRoomProblemLanguage: async () => ({ ...roomProblem, language: 'python' }),
      deleteRoomProblem: async () => roomProblem,
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {} as never, {
      isEnabled: () => false,
      acquireLock: async () => true,
      releaseLock: async () => undefined,
    } as never);

    const added = await service.addProblemToRoom(userId, roomId, problemId);
    assert.equal(added.isNew, true);

    const selected = await service.selectProblem(userId, roomId, roomProblemId);
    assert.equal(selected.selectedProblem.status, 'solving');

    const unselected = await service.unselectProblem(userId, roomId);
    assert.equal(unselected.canUseRealtime, true);

    const language = await service.updateProblemLanguage(userId, roomId, roomProblemId, 'python');
    assert.equal(language.roomProblem.language, 'python');

    const removed = await service.removeProblemFromRoom(userId, roomId, roomProblemId);
    assert.equal(removed.removedProblemId, roomProblemId);
  });

  it('runs problem submissions and blocks empty code before execution', async () => {
    const roomProblem = {
      _id: oid(roomProblemId),
      status: 'pending' as const,
      executionStatus: 'idle' as const,
      executionStartedAt: null,
      executionRequestedBy: null,
      currentCode: '',
      language: 'javascript' as const,
      testCasesPassed: 0,
      problemId: {
        _id: oid(problemId),
        testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
      },
      async save() {
        return this;
      },
      async populate() {
        return this;
      },
    };
    const service = new ProblemService({
      findRoomProblemById: () => ({
        then: (resolve: (value: typeof roomProblem) => void) => resolve(roomProblem),
        populate: async () => roomProblem,
      }),
      findRunningRoomProblem: async () => null,
      updateAttemptedProblem: async () => null,
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {
      runTestCases: async () => ({ passedCount: 1, totalCount: 1, allPassed: true, testCases: [] }),
    } as never, {
      isEnabled: () => false,
      acquireLock: async () => true,
      releaseLock: async () => undefined,
    } as never);

    await assert.rejects(() => service.runProblem({ userId, roomId, roomProblemId, code: '   ', language: 'javascript' }), BadRequestError);
    const run = await service.runProblem({ userId, roomId, roomProblemId, code: 'console.log(1)', language: 'javascript' });
    assert.equal(run.result.status, 'solved');
    assert.equal(run.roomProblem.executionStatus, 'idle');
  });

  it('blocks room problem changes while code execution is running', async () => {
    const service = new ProblemService({
      findRunningRoomProblem: async () => ({ _id: oid(roomProblemId) }),
      findCollabRoomById: async () => ({ _id: oid(roomId) }),
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {} as never, {} as never);

    await assert.rejects(() => service.selectProblem(userId, roomId, roomProblemId), ConflictError);
    await assert.rejects(() => service.unselectProblem(userId, roomId), ConflictError);
    await assert.rejects(() => service.removeProblemFromRoom(userId, roomId, roomProblemId), ConflictError);
  });
});

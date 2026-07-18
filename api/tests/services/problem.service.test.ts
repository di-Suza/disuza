import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ProblemService } from '../../src/modules/problems/problem.service.js';
import { BadRequestError } from '../../src/shared/errors/index.js';
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

  it('adds, selects, unselects, and changes room problem language with realtime access status', async () => {
    const roomProblem = {
      _id: oid(roomProblemId),
      status: 'pending' as const,
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
      findRoomProblemById: () => ({
        then: (resolve: (value: typeof roomProblem) => void) => resolve(roomProblem),
        populate: async () => roomProblem,
      }),
      updateAttemptedProblem: async () => null,
      updateRoomProblemLanguage: async () => ({ ...roomProblem, language: 'python' }),
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
  });

  it('runs problem submissions and blocks empty code before execution', async () => {
    const roomProblem = {
      _id: oid(roomProblemId),
      status: 'pending' as const,
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
      updateAttemptedProblem: async () => null,
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {
      runTestCases: async () => ({ passedCount: 1, allPassed: true, results: [] }),
    } as never, {
      isEnabled: () => false,
      acquireLock: async () => true,
      releaseLock: async () => undefined,
    } as never);

    await assert.rejects(() => service.runProblem({ userId, roomId, roomProblemId, code: '   ', language: 'javascript' }), BadRequestError);
    const run = await service.runProblem({ userId, roomId, roomProblemId, code: 'console.log(1)', language: 'javascript' });
    assert.equal(run.result.status, 'solved');
  });
});

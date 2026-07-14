import type { Types } from 'mongoose';

import env from '../../config/env.js';
import redisCache, { type RedisCache } from '../../infrastructure/cache/redis.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/index.js';
import collabRoomAccessService, { type CollabRoomAccessService } from '../collab/collabRoomAccess.service.js';
import { type Problem, type ProblemLanguage } from './problem.model.js';
import problemRepository, { type ProblemRepository, type SearchProblemFilter } from './problem.repository.js';
import codeExecutionService, { type CodeExecutionService } from './codeExecution.service.js';

type RunProblemInput = {
  userId: string;
  roomId: string;
  roomProblemId: string;
  code: string;
  language: ProblemLanguage;
};

type PopulatedProblem = Problem & {
  _id: Types.ObjectId;
};

type RoomProblemWithProblem = {
  _id: Types.ObjectId;
  status: 'pending' | 'solving' | 'solved' | 'attempted';
  currentCode: string;
  language: ProblemLanguage;
  testCasesPassed: number;
  problemId: PopulatedProblem;
  save: () => Promise<unknown>;
  populate: (path: string) => Promise<unknown>;
};

class ProblemService {
  constructor(
    private readonly problems: ProblemRepository = problemRepository,
    private readonly roomAccess: CollabRoomAccessService = collabRoomAccessService,
    private readonly codeRunner: CodeExecutionService = codeExecutionService,
    private readonly cache: RedisCache = redisCache,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback = 8, max = 20): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
  }

  async getRoomRealtimeAccess(userId: string, roomId: string) {
    const access = await this.roomAccess.getRoomAccess(userId, roomId);
    return access.canUseRealtime;
  }

  async searchProblem(queryInput: unknown, pageInput: unknown, limitInput: unknown, roomId: string, userId: string) {
    await this.roomAccess.getRoomAccess(userId, roomId);

    const query = typeof queryInput === 'string' ? queryInput.trim() : '';
    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput);
    const filter: SearchProblemFilter = {};

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ];
    }

    const allProblems = await this.problems.searchProblems(filter, page, limit);

    return Promise.all(allProblems.map(async (problem) => {
      const isAdded = await this.problems.existsInRoom(roomId, problem._id);

      return {
        ...problem.toObject(),
        isAdded: Boolean(isAdded),
      };
    }));
  }

  async addProblemToRoom(userId: string, roomId: string, problemId: string) {
    const access = await this.roomAccess.getRoomAccess(userId, roomId);
    const problem = await this.problems.findProblemById(problemId);

    if (!problem) {
      throw new NotFoundError('Problem not found');
    }

    let roomProblem = await this.problems.findRoomProblem(roomId, problemId);

    if (roomProblem) {
      return {
        roomProblem,
        isNew: false,
        canUseRealtime: access.canUseRealtime,
      };
    }

    roomProblem = await this.problems.createRoomProblem({
      roomId,
      problemId,
      currentCode: problem.boilerplate?.javascript || '',
      language: 'javascript',
    });

    await roomProblem.populate('problemId');

    return {
      roomProblem,
      isNew: true,
      canUseRealtime: access.canUseRealtime,
    };
  }

  async selectProblem(userId: string, roomId: string, roomProblemId: string) {
    const access = await this.roomAccess.getRoomAccess(userId, roomId);
    const collabRoom = await this.problems.findCollabRoomById(roomId);

    if (!collabRoom) {
      throw new NotFoundError('Collaboration room not found');
    }

    const selectedProblem = await this.problems.findRoomProblemById(roomId, roomProblemId);

    if (!selectedProblem) {
      throw new NotFoundError('Problem not found in this room');
    }

    const previousProblemId = collabRoom.currentlySelectedProblem;
    let previousProblem = null;

    if (previousProblemId && previousProblemId.toString() !== selectedProblem._id.toString()) {
      previousProblem = await this.problems.updateAttemptedProblem(roomId, previousProblemId);
    }

    if (selectedProblem.status !== 'solved') {
      selectedProblem.status = 'solving';
    }

    await selectedProblem.save();

    collabRoom.currentlySelectedProblem = selectedProblem._id;
    await collabRoom.save();

    await selectedProblem.populate('problemId');

    return {
      selectedProblem,
      previousProblem,
      canUseRealtime: access.canUseRealtime,
    };
  }

  async unselectProblem(userId: string, roomId: string) {
    const access = await this.roomAccess.getRoomAccess(userId, roomId);
    const collabRoom = await this.problems.findCollabRoomById(roomId);

    if (!collabRoom) {
      throw new NotFoundError('Collaboration room not found');
    }

    if (!collabRoom.currentlySelectedProblem) {
      return {
        unselectedProblem: null,
        canUseRealtime: access.canUseRealtime,
      };
    }

    const unselectedProblem = await this.problems.findRoomProblemById(roomId, collabRoom.currentlySelectedProblem);

    if (unselectedProblem && unselectedProblem.status !== 'solved') {
      unselectedProblem.status = 'attempted';
      await unselectedProblem.save();
      await unselectedProblem.populate('problemId');
    }

    collabRoom.currentlySelectedProblem = null;
    await collabRoom.save();

    return {
      unselectedProblem,
      canUseRealtime: access.canUseRealtime,
    };
  }

  async updateProblemLanguage(userId: string, roomId: string, roomProblemId: string, language: ProblemLanguage) {
    const access = await this.roomAccess.getRoomAccess(userId, roomId);
    const roomProblem = await this.problems.updateRoomProblemLanguage(roomId, roomProblemId, language);

    if (!roomProblem) {
      throw new NotFoundError('Problem not found in this room');
    }

    return {
      roomProblem,
      canUseRealtime: access.canUseRealtime,
    };
  }

  async runProblem(input: RunProblemInput) {
    const access = await this.roomAccess.getRoomAccess(input.userId, input.roomId);
    const lockKey = `run:${input.roomProblemId}`;
    const lockAcquired = await this.cache.acquireLock(
      lockKey,
      input.userId.toString(),
      env.PROBLEM_RUN_LOCK_TTL_SECONDS,
    );

    if (!lockAcquired) {
      throw new ConflictError('Code is already running. Please wait.');
    }

    try {
      const roomProblem = await this.problems.findRoomProblemById(input.roomId, input.roomProblemId)
        .populate('problemId') as unknown as RoomProblemWithProblem | null;

      if (!roomProblem) {
        throw new NotFoundError('Problem not found in this room');
      }

      if (!input.code?.trim()) {
        throw new BadRequestError('Code is required');
      }

      roomProblem.currentCode = input.code;
      roomProblem.language = input.language;
      await roomProblem.save();

      const executionResult = await this.codeRunner.runTestCases({
        sourceCode: input.code,
        language: input.language,
        testCases: roomProblem.problemId.testCases,
      });

      roomProblem.testCasesPassed = executionResult.passedCount;

      if (executionResult.allPassed) {
        roomProblem.status = 'solved';
      } else if (roomProblem.status !== 'solved') {
        roomProblem.status = 'attempted';
      }

      await roomProblem.save();
      await roomProblem.populate('problemId');

      return {
        roomProblem,
        result: {
          ...executionResult,
          roomProblemId: roomProblem._id,
          status: roomProblem.status,
        },
        canUseRealtime: access.canUseRealtime,
      };
    } finally {
      await this.cache.releaseLock(lockKey);
    }
  }
}

const problemService = new ProblemService();

export { ProblemService, type RunProblemInput };
export default problemService;

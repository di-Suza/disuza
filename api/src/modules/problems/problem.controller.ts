import type { Request, RequestHandler, Response } from 'express';

import realtimeService, { type RealtimeService } from '../../infrastructure/realtime/realtime.service.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import problemService, { type ProblemService } from './problem.service.js';

class ProblemController {
  readonly searchProblem: RequestHandler;
  readonly addProblemToRoom: RequestHandler;
  readonly selectProblem: RequestHandler;
  readonly unselectProblem: RequestHandler;
  readonly updateProblemLanguage: RequestHandler;
  readonly removeProblemFromRoom: RequestHandler;
  readonly runProblem: RequestHandler;

  constructor(
    private readonly service: ProblemService = problemService,
    private readonly realtime: RealtimeService = realtimeService,
  ) {
    this.searchProblem = asyncHandler(this.handleSearchProblem.bind(this));
    this.addProblemToRoom = asyncHandler(this.handleAddProblemToRoom.bind(this));
    this.selectProblem = asyncHandler(this.handleSelectProblem.bind(this));
    this.unselectProblem = asyncHandler(this.handleUnselectProblem.bind(this));
    this.updateProblemLanguage = asyncHandler(this.handleUpdateProblemLanguage.bind(this));
    this.removeProblemFromRoom = asyncHandler(this.handleRemoveProblemFromRoom.bind(this));
    this.runProblem = asyncHandler(this.handleRunProblem.bind(this));
  }

  private getRealtimeUser(req: Request) {
    return {
      _id: req.user!.id,
      userName: req.user!.userName,
      profilePicture: req.user!.profilePicture,
    };
  }

  private async handleSearchProblem(req: Request, res: Response) {
    const limit = 8;
    const problems = await this.service.searchProblem(req.query.query, req.query.page, limit, String(req.params.roomId), req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Problems Found Successfully',
      data: problems,
      hasMore: problems.length === limit,
    });
  }

  private async handleAddProblemToRoom(req: Request, res: Response) {
    const { roomId, problemId } = req.body as { roomId: string; problemId: string };
    const { roomProblem, isNew, canUseRealtime } = await this.service.addProblemToRoom(req.user!.id, roomId, problemId);

    if (isNew && canUseRealtime) {
      this.realtime.emitToRoom(roomId, 'room_sync', {
        type: 'ADD_PROBLEM',
        roomId,
        data: {
          roomProblem,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Problem Added To Room Successfully',
      data: roomProblem,
    });
  }

  private async handleSelectProblem(req: Request, res: Response) {
    const { roomId, roomProblemId } = req.body as { roomId: string; roomProblemId: string };
    const { selectedProblem, previousProblem, canUseRealtime } = await this.service.selectProblem(req.user!.id, roomId, roomProblemId);

    if (canUseRealtime) {
      this.realtime.emitToRoom(roomId, 'room_sync', {
        type: 'SELECT_PROBLEM',
        roomId,
        data: {
          selectedProblem,
          previousProblem,
          selectedBy: this.getRealtimeUser(req),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Problem Selected Successfully',
      data: selectedProblem,
    });
  }

  private async handleUnselectProblem(req: Request, res: Response) {
    const { roomId } = req.body as { roomId: string };
    const { unselectedProblem, canUseRealtime } = await this.service.unselectProblem(req.user!.id, roomId);

    if (canUseRealtime) {
      this.realtime.emitToRoom(roomId, 'room_sync', {
        type: 'UNSELECT_PROBLEM',
        roomId,
        data: {
          unselectedProblem,
          unselectedBy: this.getRealtimeUser(req),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Problem Unselected Successfully',
      data: unselectedProblem,
    });
  }

  private async handleUpdateProblemLanguage(req: Request, res: Response) {
    const { roomId, roomProblemId, language } = req.body as { roomId: string; roomProblemId: string; language: 'javascript' | 'python' | 'cpp' };
    const { roomProblem, canUseRealtime } = await this.service.updateProblemLanguage(req.user!.id, roomId, roomProblemId, language);

    if (canUseRealtime) {
      this.realtime.emitToRoom(roomId, 'room_sync', {
        type: 'LANG_CHANGE',
        roomId,
        data: {
          roomProblem,
          changedBy: this.getRealtimeUser(req),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Language Updated Successfully',
      data: roomProblem,
    });
  }

  private async handleRemoveProblemFromRoom(req: Request, res: Response) {
    const { roomId, roomProblemId } = req.body as { roomId: string; roomProblemId: string };
    const {
      removedProblem,
      removedProblemId,
      unselectedProblem,
      canUseRealtime,
    } = await this.service.removeProblemFromRoom(req.user!.id, roomId, roomProblemId);

    if (canUseRealtime) {
      this.realtime.emitToRoom(roomId, 'room_sync', {
        type: 'REMOVE_PROBLEM',
        roomId,
        data: {
          removedProblem,
          removedProblemId,
          unselectedProblem,
          removedBy: this.getRealtimeUser(req),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Problem Removed From Room Successfully',
      data: {
        removedProblemId,
        unselectedProblem,
      },
    });
  }

  private async handleRunProblem(req: Request, res: Response) {
    const { roomId, roomProblemId, code, language } = req.body as {
      roomId: string;
      roomProblemId: string;
      code: string;
      language: 'javascript' | 'python' | 'cpp';
    };
    const canUseRealtime = await this.service.getRoomRealtimeAccess(req.user!.id, roomId);
    const triggeredBy = this.getRealtimeUser(req);

    if (canUseRealtime) {
      this.realtime.emitToRoom(roomId, 'code_execution', {
        status: 'running',
        roomId,
        roomProblemId,
        triggeredBy,
      });
    }

    try {
      const { roomProblem, result, canUseRealtime: shouldEmit } = await this.service.runProblem({
        userId: req.user!.id,
        roomId,
        roomProblemId,
        code,
        language,
      });

      if (shouldEmit) {
        this.realtime.emitToRoom(roomId, 'code_execution', {
          status: 'completed',
          roomId,
          roomProblemId,
          result,
          roomProblem,
          triggeredBy,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Code Executed Successfully',
        data: {
          result,
          roomProblem,
        },
      });
    } catch (error) {
      if (canUseRealtime) {
        this.realtime.emitToRoom(roomId, 'code_execution', {
          status: 'failed',
          roomId,
          roomProblemId,
          error: error instanceof Error ? error.message : 'Code execution failed',
          triggeredBy,
        });
      }

      throw error;
    }
  }
}

const problemController = new ProblemController();

export { ProblemController };
export default problemController;

import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import collabService, { type CollabService } from './collab.service.js';

class CollabController {
  readonly getCollabStatus: RequestHandler;
  readonly sendCollabRequest: RequestHandler;
  readonly acceptCollabRequest: RequestHandler;
  readonly getCollabRoom: RequestHandler;
  readonly getMyRooms: RequestHandler;
  readonly getPersonalRoom: RequestHandler;

  constructor(private readonly service: CollabService = collabService) {
    this.getCollabStatus = asyncHandler(this.handleGetCollabStatus.bind(this));
    this.sendCollabRequest = asyncHandler(this.handleSendCollabRequest.bind(this));
    this.acceptCollabRequest = asyncHandler(this.handleAcceptCollabRequest.bind(this));
    this.getCollabRoom = asyncHandler(this.handleGetCollabRoom.bind(this));
    this.getMyRooms = asyncHandler(this.handleGetMyRooms.bind(this));
    this.getPersonalRoom = asyncHandler(this.handleGetPersonalRoom.bind(this));
  }

  private async handleGetCollabStatus(req: Request, res: Response) {
    const data = await this.service.checkCollabRequestStatus(req.user!.id, String(req.params.conversationId));

    res.status(200).json({
      message: 'Collab Status Retrieved!',
      success: true,
      data,
    });
  }

  private async handleSendCollabRequest(req: Request, res: Response) {
    const request = await this.service.sendCollabRequest(req.user!.id, String(req.params.conversationId));

    res.status(201).json({
      message: 'Collab Request Sent!',
      success: true,
      data: request,
    });
  }

  private async handleAcceptCollabRequest(req: Request, res: Response) {
    const data = await this.service.acceptCollabRequest(req.user!.id, String(req.params.conversationId));

    res.status(201).json({
      message: 'Collab Request Accepted!',
      success: true,
      data,
    });
  }

  private async handleGetCollabRoom(req: Request, res: Response) {
    const data = await this.service.getCollabRoom(req.user!.id, String(req.params.roomId));

    res.status(200).json({
      message: 'Collab Room Retrieved!',
      success: true,
      data,
    });
  }

  private async handleGetMyRooms(req: Request, res: Response) {
    const data = await this.service.getMyRooms(req.user!.id);

    res.status(200).json({
      message: 'Rooms fetched successfully!',
      success: true,
      data,
    });
  }

  private async handleGetPersonalRoom(req: Request, res: Response) {
    const data = await this.service.getOrCreatePersonalRoom(req.user!.id);

    res.status(200).json({
      message: 'Personal room ready!',
      success: true,
      data,
    });
  }
}

const collabController = new CollabController();

export { CollabController };
export default collabController;

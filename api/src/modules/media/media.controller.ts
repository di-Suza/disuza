import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import mediaService, { type MediaService } from './media.service.js';

class MediaController {
  readonly getUploadAuth: RequestHandler;

  constructor(private readonly service: MediaService = mediaService) {
    this.getUploadAuth = asyncHandler(this.handleGetUploadAuth.bind(this));
  }

  private async handleGetUploadAuth(_req: Request, res: Response) {
    const auth = this.service.getClientUploadAuth();

    res.status(200).json({
      success: true,
      message: 'Media upload auth generated successfully!',
      auth,
    });
  }
}

const mediaController = new MediaController();

export { MediaController };
export default mediaController;

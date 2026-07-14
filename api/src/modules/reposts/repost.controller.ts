import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import repostService, { type RepostService } from './repost.service.js';

class RepostController {
  readonly repostPost: RequestHandler;
  readonly unrepostPost: RequestHandler;

  constructor(private readonly service: RepostService = repostService) {
    this.repostPost = asyncHandler(this.handleRepostPost.bind(this));
    this.unrepostPost = asyncHandler(this.handleUnrepostPost.bind(this));
  }

  private async handleRepostPost(req: Request, res: Response) {
    const data = await this.service.repost(req.user!.id, String(req.params.postId));

    res.status(201).json({
      success: true,
      message: 'Post reposted successfully!',
      ...data,
    });
  }

  private async handleUnrepostPost(req: Request, res: Response) {
    const data = await this.service.unrepost(req.user!.id, String(req.params.postId));

    res.status(200).json({
      success: true,
      message: data.alreadyUnreposted ? 'Post was not reposted!' : 'Repost removed successfully!',
      ...data,
    });
  }
}

const repostController = new RepostController();

export { RepostController };
export default repostController;

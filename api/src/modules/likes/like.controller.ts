import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import likeService, { type LikeService } from './like.service.js';

class LikeController {
  readonly likePost: RequestHandler;
  readonly unlikePost: RequestHandler;

  constructor(private readonly service: LikeService = likeService) {
    this.likePost = asyncHandler(this.handleLikePost.bind(this));
    this.unlikePost = asyncHandler(this.handleUnlikePost.bind(this));
  }

  private async handleLikePost(req: Request, res: Response) {
    const result = await this.service.likePost(req.user!.id, String(req.params.postId));

    res.status(201).json({
      success: true,
      message: 'Post Liked!',
      ...result,
    });
  }

  private async handleUnlikePost(req: Request, res: Response) {
    const result = await this.service.unlikePost(req.user!.id, String(req.params.postId));

    res.status(200).json({
      success: true,
      message: 'Post Unliked!',
      ...result,
    });
  }
}

const likeController = new LikeController();

export { LikeController };
export default likeController;
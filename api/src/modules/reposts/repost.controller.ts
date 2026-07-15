import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import repostService, { type RepostService } from './repost.service.js';

class RepostController {
  readonly getRepost: RequestHandler;
  readonly getUserReposts: RequestHandler;
  readonly repostPost: RequestHandler;
  readonly unrepostPost: RequestHandler;

  constructor(private readonly service: RepostService = repostService) {
    this.getRepost = asyncHandler(this.handleGetRepost.bind(this));
    this.getUserReposts = asyncHandler(this.handleGetUserReposts.bind(this));
    this.repostPost = asyncHandler(this.handleRepostPost.bind(this));
    this.unrepostPost = asyncHandler(this.handleUnrepostPost.bind(this));
  }

  private async handleGetRepost(req: Request, res: Response) {
    const repost = await this.service.getRepost(req.user!.id, String(req.params.repostId));

    res.status(200).json({
      success: true,
      message: 'Repost fetched successfully!',
      repost,
    });
  }

  private async handleGetUserReposts(req: Request, res: Response) {
    const data = await this.service.getUserReposts(
      req.user!.id,
      String(req.params.userId),
      req.query.page,
      req.query.limit,
    );

    res.status(200).json({
      success: true,
      message: 'Reposts fetched successfully!',
      ...data,
    });
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

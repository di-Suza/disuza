import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import postService, { type PostService } from './post.service.js';

type FileFieldMap = Record<string, Express.Multer.File[]>;

const getUploadedPostMediaFiles = (req: Request): Express.Multer.File[] => {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;

  const fileFields = req.files as FileFieldMap;

  return [
    ...(fileFields.media || []),
    ...(fileFields.images || []),
  ];
};

const getPostId = (req: Request): string => String(req.params.postId);

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  return String(forwardedIp || req.ip || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
};

class PostController {
  readonly createPost: RequestHandler;
  readonly getAllPosts: RequestHandler;
  readonly getPost: RequestHandler;
  readonly getPostAnalytics: RequestHandler;
  readonly trackLinkClick: RequestHandler;
  readonly updatePost: RequestHandler;
  readonly deletePost: RequestHandler;
  readonly getFeed: RequestHandler;

  constructor(private readonly service: PostService = postService) {
    this.createPost = asyncHandler(this.handleCreatePost.bind(this));
    this.getAllPosts = asyncHandler(this.handleGetAllPosts.bind(this));
    this.getPost = asyncHandler(this.handleGetPost.bind(this));
    this.getPostAnalytics = asyncHandler(this.handleGetPostAnalytics.bind(this));
    this.trackLinkClick = asyncHandler(this.handleTrackLinkClick.bind(this));
    this.updatePost = asyncHandler(this.handleUpdatePost.bind(this));
    this.deletePost = asyncHandler(this.handleDeletePost.bind(this));
    this.getFeed = asyncHandler(this.handleGetFeed.bind(this));
  }

  private async handleCreatePost(req: Request, res: Response) {
    const post = await this.service.createPost(req.user!.id, req.body, getUploadedPostMediaFiles(req));

    res.status(201).json({
      success: true,
      message: 'Post created successfully!',
      post,
    });
  }

  private async handleGetAllPosts(req: Request, res: Response) {
    const data = await this.service.getDashboardPosts(req.user!.id, req.query.page, req.query.limit);

    res.status(200).json({
      success: true,
      message: 'Posts fetched successfully!',
      ...data,
    });
  }

  private async handleGetPost(req: Request, res: Response) {
    const post = await this.service.getPost(req.user!.id, getPostId(req));

    res.status(200).json({
      success: true,
      message: 'Post fetched successfully!',
      post,
    });
  }

  private async handleGetPostAnalytics(req: Request, res: Response) {
    const data = await this.service.getPostAnalytics(req.user!.id, getPostId(req), req.query.section, req.query.page, req.query.limit);

    res.status(200).json({
      success: true,
      message: 'Post analytics fetched successfully!',
      ...data,
    });
  }

  private async handleTrackLinkClick(req: Request, res: Response) {
    const data = await this.service.trackLinkClick(req.user!.id, getPostId(req), String(req.body.linkKey), getClientIp(req));

    res.status(200).json({
      success: true,
      message: data.counted ? 'Link click tracked.' : 'Link click already tracked recently.',
      ...data,
    });
  }

  private async handleUpdatePost(req: Request, res: Response) {
    const post = await this.service.updatePost(req.user!.id, getPostId(req), req.body, getUploadedPostMediaFiles(req));

    res.status(200).json({
      success: true,
      message: 'Post updated successfully!',
      post,
    });
  }

  private async handleDeletePost(req: Request, res: Response) {
    const result = await this.service.deletePost(req.user!.id, getPostId(req));

    res.status(200).json({
      success: true,
      message: result.alreadyDeleting ? 'Post delete is already in progress!' : 'Post deleted successfully!',
      ...result,
    });
  }

  private async handleGetFeed(req: Request, res: Response) {
    const data = await this.service.getFeed(req.user!.id, req.query.page, req.query.limit, req.query.type, req.query.excludePostIds);

    res.status(200).json({
      success: true,
      message: 'Feed fetched successfully!',
      ...data,
    });
  }
}

const postController = new PostController();

export { PostController, getUploadedPostMediaFiles };
export default postController;

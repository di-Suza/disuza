import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import commentService, { type CommentService } from './comment.service.js';

class CommentController {
  readonly postComment: RequestHandler;
  readonly getAllComments: RequestHandler;
  readonly getReplies: RequestHandler;
  readonly deleteComment: RequestHandler;

  constructor(private readonly service: CommentService = commentService) {
    this.postComment = asyncHandler(this.handlePostComment.bind(this));
    this.getAllComments = asyncHandler(this.handleGetAllComments.bind(this));
    this.getReplies = asyncHandler(this.handleGetReplies.bind(this));
    this.deleteComment = asyncHandler(this.handleDeleteComment.bind(this));
  }

  private async handlePostComment(req: Request, res: Response) {
    const newComment = await this.service.createComment(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully!',
      newComment,
    });
  }

  private async handleGetAllComments(req: Request, res: Response) {
    const data = await this.service.getAllComments(
      String(req.params.postId),
      req.query.page,
      req.query.limit,
      req.user!.id,
    );

    res.status(200).json({
      success: true,
      message: 'Fetched 10 Comments Successfully!',
      ...data,
    });
  }

  private async handleGetReplies(req: Request, res: Response) {
    const data = await this.service.getReplies(
      String(req.params.commentId),
      req.query.page,
      req.query.limit,
      req.user!.id,
    );

    res.status(200).json({
      success: true,
      message: 'Fetched replies successfully!',
      ...data,
    });
  }

  private async handleDeleteComment(req: Request, res: Response) {
    const { postId, commentId } = req.body as { postId: string; commentId: string };
    const deleteResult = await this.service.deleteComment(req.user!.id, postId, commentId);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully!',
      commentId,
      deletedCount: deleteResult.deletedCount,
      parentCommentId: deleteResult.parentCommentId,
    });
  }
}

const commentController = new CommentController();

export { CommentController };
export default commentController;
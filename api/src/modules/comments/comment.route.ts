import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import commentController from './comment.controller.js';
import { createCommentRules, deleteCommentRules, getCommentsRules, getRepliesRules } from './validators/comment.validator.js';

class CommentRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.post('/postComment', createCommentRules, validateRequest, commentController.postComment);
    this.router.get('/getAllComments/:postId', getCommentsRules, validateRequest, commentController.getAllComments);
    this.router.get('/getReplies/:commentId', getRepliesRules, validateRequest, commentController.getReplies);
    this.router.delete('/deleteComment', deleteCommentRules, validateRequest, commentController.deleteComment);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { CommentRoutes };
export default new CommentRoutes().getRouter();
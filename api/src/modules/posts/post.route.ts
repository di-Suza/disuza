import { Router } from 'express';

import { uploadPostMedia } from '../media/media.middleware.js';
import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import postController from './post.controller.js';
import { createPostRules, pageQueryRules, postIdParamRules, updatePostRules } from './validators/post.validator.js';

class PostRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.post('/createPost', uploadPostMedia, createPostRules, validateRequest, postController.createPost);
    this.router.get('/getAllPosts', pageQueryRules, validateRequest, postController.getAllPosts);
    this.router.get('/getPost/:postId', postIdParamRules, validateRequest, postController.getPost);
    this.router.patch('/updatePost/:postId', uploadPostMedia, updatePostRules, validateRequest, postController.updatePost);
    this.router.delete('/deletePost/:postId', postIdParamRules, validateRequest, postController.deletePost);
    this.router.get('/feed', pageQueryRules, validateRequest, postController.getFeed);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { PostRoutes };
export default new PostRoutes().getRouter();

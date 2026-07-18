import { Router } from 'express';

import { uploadPostMedia } from '../media/media.middleware.js';
import { authenticate } from '../../shared/middleware/auth.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import likeController from '../likes/like.controller.js';
import reportController from '../reports/report.controller.js';
import { postReportRules } from '../reports/validators/report.validator.js';
import repostController from '../reposts/repost.controller.js';
import saveController from '../saves/save.controller.js';
import { collectionIdParamRules, collectionNameRules, savePostRules, savedCollectionPostsRules } from '../saves/validators/save.validator.js';
import { mongoIdParam } from '../../shared/validators/common.js';
import postController from './post.controller.js';
import {
  createPostRules,
  pageQueryRules,
  postAnalyticsRules,
  postIdParamRules,
  trackPostLinkClickRules,
  updatePostRules,
} from './validators/post.validator.js';

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
    this.router.get('/analytics/:postId', postAnalyticsRules, validateRequest, postController.getPostAnalytics);
    this.router.post('/analytics/:postId/link-click', trackPostLinkClickRules, validateRequest, postController.trackLinkClick);
    this.router.patch('/updatePost/:postId', uploadPostMedia, updatePostRules, validateRequest, postController.updatePost);
    this.router.delete('/deletePost/:postId', postIdParamRules, validateRequest, postController.deletePost);
    this.router.post('/reportPost', postReportRules, validateRequest, reportController.reportPost);
    this.router.post('/likePost/:postId', postIdParamRules, validateRequest, likeController.likePost);
    this.router.post('/unlikePost/:postId', postIdParamRules, validateRequest, likeController.unlikePost);
    this.router.get('/reposts/user/:userId', mongoIdParam('userId'), pageQueryRules, validateRequest, repostController.getUserReposts);
    this.router.get('/reposts/:repostId', mongoIdParam('repostId'), validateRequest, repostController.getRepost);
    this.router.post('/repostPost/:postId', postIdParamRules, validateRequest, repostController.repostPost);
    this.router.delete('/unrepostPost/:postId', postIdParamRules, validateRequest, repostController.unrepostPost);
    this.router.post('/savePost', savePostRules, validateRequest, saveController.savePost);
    this.router.delete('/unsavePost/:postId', postIdParamRules, validateRequest, saveController.unsavePost);
    this.router.get('/getSavedPostsCollections', saveController.getSavedPostsCollections);
    this.router.post('/createCollection', collectionNameRules, validateRequest, saveController.createCollection);
    this.router.patch('/updateCollection/:id', collectionIdParamRules, collectionNameRules, validateRequest, saveController.updateCollection);
    this.router.delete('/deleteCollection/:id', collectionIdParamRules, validateRequest, saveController.deleteCollection);
    this.router.get('/savedCollections/:id/posts', savedCollectionPostsRules, validateRequest, saveController.getSavedCollectionPosts);
    this.router.patch('/changeSavedPostCollection', savePostRules, validateRequest, saveController.changeSavedPostCollection);
    this.router.get('/feed', pageQueryRules, validateRequest, postController.getFeed);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { PostRoutes };
export default new PostRoutes().getRouter();

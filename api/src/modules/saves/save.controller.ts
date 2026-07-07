import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import saveService, { type SaveService } from './save.service.js';

const getCollectionId = (req: Request): string => String(req.params.id);
const getPostId = (req: Request): string => String(req.params.postId);

class SaveController {
  readonly savePost: RequestHandler;
  readonly unsavePost: RequestHandler;
  readonly getSavedPostsCollections: RequestHandler;
  readonly changeSavedPostCollection: RequestHandler;
  readonly createCollection: RequestHandler;
  readonly updateCollection: RequestHandler;
  readonly deleteCollection: RequestHandler;
  readonly getSavedCollectionPosts: RequestHandler;

  constructor(private readonly service: SaveService = saveService) {
    this.savePost = asyncHandler(this.handleSavePost.bind(this));
    this.unsavePost = asyncHandler(this.handleUnsavePost.bind(this));
    this.getSavedPostsCollections = asyncHandler(this.handleGetSavedPostsCollections.bind(this));
    this.changeSavedPostCollection = asyncHandler(this.handleChangeSavedPostCollection.bind(this));
    this.createCollection = asyncHandler(this.handleCreateCollection.bind(this));
    this.updateCollection = asyncHandler(this.handleUpdateCollection.bind(this));
    this.deleteCollection = asyncHandler(this.handleDeleteCollection.bind(this));
    this.getSavedCollectionPosts = asyncHandler(this.handleGetSavedCollectionPosts.bind(this));
  }

  private async handleSavePost(req: Request, res: Response) {
    const result = await this.service.savePost(req.user!.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Post Saved!',
      data: result,
    });
  }

  private async handleUnsavePost(req: Request, res: Response) {
    const result = await this.service.unsavePost(req.user!.id, getPostId(req));

    res.status(200).json({
      success: true,
      message: 'Post Unsaved!',
      ...result,
    });
  }

  private async handleGetSavedPostsCollections(req: Request, res: Response) {
    const collections = await this.service.getSavedPostsCollections(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'All Collections Fetched Successfully!',
      collections,
    });
  }

  private async handleChangeSavedPostCollection(req: Request, res: Response) {
    const result = await this.service.changeSavedPostCollection(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Post Saved!',
      data: result,
    });
  }

  private async handleCreateCollection(req: Request, res: Response) {
    const collection = await this.service.createCollection(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Collection Created Successfully!',
      collection,
    });
  }

  private async handleUpdateCollection(req: Request, res: Response) {
    const collection = await this.service.updateCollection(req.user!.id, getCollectionId(req), req.body);

    res.status(200).json({
      success: true,
      message: 'Collection Updated Successfully!',
      collection,
    });
  }

  private async handleDeleteCollection(req: Request, res: Response) {
    const result = await this.service.deleteCollection(req.user!.id, getCollectionId(req));

    res.status(201).json({
      success: true,
      message: 'Collection Deleted Successfully!',
      ...result,
    });
  }

  private async handleGetSavedCollectionPosts(req: Request, res: Response) {
    const data = await this.service.getSavedCollectionPosts(req.user!.id, getCollectionId(req), req.query.page, req.query.limit);

    res.status(200).json({
      success: true,
      message: 'Saved posts fetched successfully!',
      ...data,
    });
  }
}

const saveController = new SaveController();

export { SaveController };
export default saveController;
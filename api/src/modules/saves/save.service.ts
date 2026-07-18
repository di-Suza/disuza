import mongoose, { type Types } from 'mongoose';

import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/index.js';
import likeRepository, { type LikeRepository } from '../likes/like.repository.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import { DEFAULT_SAVE_COVER } from './save.constants.js';
import saveRepository, { type SaveRepository } from './save.repository.js';
import savedCollectionRepository, { type SavedCollectionRepository } from './savedCollection.repository.js';

type SavePostInput = {
  postId: string;
  collectionId?: string;
};

type CollectionNameInput = {
  name?: string;
};

type SaveActionResult = {
  saved: boolean;
  collection?: {
    _id: Types.ObjectId;
    name: string;
  };
  message?: string;
};

type DuplicateKeyError = {
  code?: number;
};

const isDuplicateKeyError = (error: unknown): error is DuplicateKeyError => (
  typeof error === 'object' && error !== null && (error as DuplicateKeyError).code === 11000
);

const toObjectId = (value: string | Types.ObjectId) => new mongoose.Types.ObjectId(value.toString());

const getMediaCoverImage = (media: unknown): string => {
  if (!Array.isArray(media) || media.length === 0) return DEFAULT_SAVE_COVER;

  const firstMedia = media[0] as { thumbnailUrl?: string; url?: string };
  return firstMedia.thumbnailUrl || firstMedia.url || DEFAULT_SAVE_COVER;
};

class SaveService {
  constructor(
    private readonly saves: SaveRepository = saveRepository,
    private readonly collections: SavedCollectionRepository = savedCollectionRepository,
    private readonly posts: PostRepository = postRepository,
    private readonly likes: LikeRepository = likeRepository,
    private readonly blockRules: BlockService = blockService,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback: number, max: number): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
  }

  private normalizeCollectionName(input: CollectionNameInput | string): string {
    const rawName = typeof input === 'string' ? input : input.name;
    const name = rawName?.trim();

    if (!name) {
      throw new BadRequestError('Collection name is required');
    }

    return name;
  }

  private async getPostCoverImage(postId: string | Types.ObjectId): Promise<string> {
    const post = await this.posts.findVisibleCoverMedia(postId);
    return getMediaCoverImage(post?.media);
  }

  private async refreshCollectionCover(userId: string, collectionId: string | Types.ObjectId): Promise<string> {
    const nextPostSave = await this.saves.findLatestInCollection(userId, collectionId);
    const coverImage = nextPostSave ? await this.getPostCoverImage(nextPostSave.post) : DEFAULT_SAVE_COVER;

    await this.collections.updateCover(userId, collectionId, coverImage);

    return coverImage;
  }

  private async getPostActionTarget(userId: string, postId: string, action: string) {
    const post = await this.posts.findVisibleSaveTarget(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    await this.blockRules.ensureUsersCanInteract(userId, post.user, action);

    return {
      post,
      coverImage: getMediaCoverImage(post.media),
    };
  }

  private async getActiveCollection(userId: string, collectionId?: string) {
    let activeCollection = collectionId ? await this.collections.findOwnedById(userId, collectionId) : null;

    if (!activeCollection) {
      activeCollection = await this.collections.findSelected(userId);
    }

    if (!activeCollection) {
      activeCollection = await this.collections.ensureDefaultCollection(userId);
    }

    return activeCollection;
  }

  async savePost(userId: string, input: SavePostInput): Promise<SaveActionResult> {
    const { coverImage: postCoverImage } = await this.getPostActionTarget(userId, input.postId, 'save posts from');
    const activeCollection = await this.getActiveCollection(userId, input.collectionId);

    if (!activeCollection.selected) {
      await this.collections.selectOnly(userId, activeCollection._id, postCoverImage);
    } else if (!activeCollection.coverImage || activeCollection.coverImage === DEFAULT_SAVE_COVER) {
      await this.collections.updateCover(userId, activeCollection._id, postCoverImage);
    }

    const targetCollectionId = activeCollection._id;
    const collectionName = activeCollection.name;
    const existingSave = await this.saves.findByUserAndPost(userId, input.postId);

    if (existingSave) {
      if (existingSave.collectionId.toString() !== targetCollectionId.toString()) {
        const sourceCollectionId = existingSave.collectionId;

        await this.saves.updateCollection(existingSave._id, targetCollectionId);
        await this.refreshCollectionCover(userId, sourceCollectionId);
      }

      return {
        saved: true,
        collection: { _id: targetCollectionId, name: collectionName },
      };
    }

    try {
      await this.saves.create(userId, input.postId, targetCollectionId);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }

    return {
      saved: true,
      collection: { _id: targetCollectionId, name: collectionName },
    };
  }

  async unsavePost(userId: string, postId: string): Promise<SaveActionResult> {
    const deletedSave = await this.saves.deleteByUserAndPost(userId, postId);

    if (!deletedSave) {
      return { saved: false, message: 'Post was not saved' };
    }

    await this.refreshCollectionCover(userId, deletedSave.collectionId);

    return { saved: false, message: 'Post removed from saves' };
  }

  async getSavedPostsCollections(userId: string) {
    const blockedUserIds = (await this.blockRules.getBlockedUserIds(userId)).map((id) => toObjectId(id));
    const collections = await this.collections.findAllByOwner(userId);

    if (collections.length === 0) {
      const defaultCollection = await this.collections.ensureDefaultCollection(userId);
      return [{ ...defaultCollection.toObject(), postsCount: 0 }];
    }

    const collectionIds = collections.map((collection) => collection._id);
    const saveCounts = await this.saves.countVisibleByCollections(userId, collectionIds, blockedUserIds);
    const countsMap = new Map(saveCounts.map((item) => [item._id.toString(), item.postsCount]));

    return collections.map((collection) => ({
      ...collection,
      postsCount: countsMap.get(collection._id.toString()) || 0,
    }));
  }

  async createCollection(userId: string, input: CollectionNameInput | string) {
    const name = this.normalizeCollectionName(input);

    await this.collections.clearSelected(userId);

    try {
      return await this.collections.create(userId, name);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError('Collection with this name already exists');
      }
      throw error;
    }
  }

  async updateCollection(userId: string, collectionId: string, input: CollectionNameInput | string) {
    const name = this.normalizeCollectionName(input);
    const collection = await this.collections.findOwnedById(userId, collectionId);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    if (collection.isSystemGenerated) {
      throw new BadRequestError('System generated collections cannot be edited');
    }

    try {
      return await this.collections.updateName(collection._id, name);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError('Collection with this name already exists');
      }
      throw error;
    }
  }

  async deleteCollection(userId: string, collectionId: string) {
    const collection = await this.collections.findOwnedById(userId, collectionId);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    if (collection.isSystemGenerated) {
      throw new BadRequestError('System generated collections cannot be deleted');
    }

    if (collection.selected) {
      await this.collections.ensureDefaultCollection(userId);
    }

    const [, deletedSaves] = await Promise.all([
      this.collections.deleteById(collectionId),
      this.saves.deleteManyByCollection(userId, collectionId),
    ]);

    return { deletedSaves: deletedSaves.deletedCount || 0 };
  }

  async changeSavedPostCollection(userId: string, input: SavePostInput) {
    const { coverImage } = await this.getPostActionTarget(userId, input.postId, 'save posts from');

    if (!input.collectionId) {
      throw new BadRequestError('Collection id is required');
    }

    const targetCollection = await this.collections.findOwnedById(userId, input.collectionId);

    if (!targetCollection) {
      throw new NotFoundError('Target collection not found');
    }

    const previousSave = await this.saves.findByUserAndPost(userId, input.postId);
    const sourceCollectionId = previousSave?.collectionId;

    await this.saves.upsertCollection(userId, input.postId, targetCollection._id);
    await this.collections.selectOnly(userId, targetCollection._id, coverImage);

    if (sourceCollectionId && sourceCollectionId.toString() !== targetCollection._id.toString()) {
      await this.refreshCollectionCover(userId, sourceCollectionId);
    }

    return {
      success: true,
      saved: true,
      collection: { _id: targetCollection._id, name: targetCollection.name },
    };
  }

  async getSavedCollectionPosts(userId: string, collectionId: string, pageInput: unknown, limitInput: unknown) {
    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput, 12, 24);
    const skip = (page - 1) * limit;
    const collection = await this.collections.findOwnedByIdLean(userId, collectionId);

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    const blockedUserIds = (await this.blockRules.getBlockedUserIds(userId)).map((id) => toObjectId(id));
    const [saves, countResult] = await this.saves.findVisibleCollectionPosts(userId, collectionId, blockedUserIds, skip, limit);
    const totalPosts = countResult[0]?.totalPosts || 0;
    const likedPostIds = await this.likes.findLikedPostIds(userId, saves.map((save) => save.post._id));
    const posts = saves.map((save) => ({
      ...save.post,
      isLiked: likedPostIds.has(save.post._id.toString()),
      isSaved: true,
      savedAt: save.createdAt,
      savedCollectionId: collectionId,
    }));

    return {
      collection: {
        ...collection,
        postsCount: totalPosts,
      },
      posts,
      page,
      hasMore: skip + saves.length < totalPosts,
    };
  }
}

const saveService = new SaveService();

export { SaveService, type SaveActionResult, type SavePostInput };
export default saveService;
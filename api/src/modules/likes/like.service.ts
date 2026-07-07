import { NotFoundError } from '../../shared/errors/index.js';
import notificationService, { type NotificationService } from '../notifications/notification.service.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import likeRepository, { type LikeRepository } from './like.repository.js';

type LikeActionResult = {
  liked: boolean;
  alreadyLiked?: boolean;
  alreadyUnliked?: boolean;
};

class LikeService {
  constructor(
    private readonly likes: LikeRepository = likeRepository,
    private readonly posts: PostRepository = postRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly notifications: NotificationService = notificationService,
  ) {}

  private async getPostActionTarget(userId: string, postId: string, action: string) {
    const post = await this.posts.findVisibleActionTarget(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    await this.blockRules.ensureUsersCanInteract(userId, post.user, action);

    return post;
  }

  async likePost(userId: string, postId: string): Promise<LikeActionResult> {
    const post = await this.getPostActionTarget(userId, postId, 'like posts from');
    const result = await this.likes.createOnce(userId, postId);

    if (!result.created) {
      return { liked: true, alreadyLiked: true };
    }

    const updatedPost = await this.posts.incrementLikesCount(post._id, 1);

    if (!updatedPost) {
      await this.likes.deleteOne(userId, postId);
      throw new NotFoundError('Post not found');
    }

    await this.notifications.send({
      senderId: userId,
      recipientId: post.user,
      type: 'LIKE',
      contentId: post._id,
      onModel: 'Post',
    });

    return { liked: true, alreadyLiked: false };
  }
  async unlikePost(userId: string, postId: string): Promise<LikeActionResult> {
    const post = await this.getPostActionTarget(userId, postId, 'unlike posts from');
    const result = await this.likes.deleteOne(userId, postId);

    if (!result.deleted) {
      return { liked: false, alreadyUnliked: true };
    }

    await Promise.all([
      this.posts.incrementLikesCount(post._id, -1),
      this.notifications.remove({
        senderId: userId,
        recipientId: post.user,
        type: 'LIKE',
        contentId: post._id,
      }),
    ]);

    return { liked: false, alreadyUnliked: false };
  }
}

const likeService = new LikeService();

export { LikeService, type LikeActionResult };
export default likeService;

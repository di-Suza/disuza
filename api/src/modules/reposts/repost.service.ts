import { ConflictError, NotFoundError } from '../../shared/errors/index.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import repostRepository, { type RepostRepository } from './repost.repository.js';

class RepostService {
  constructor(
    private readonly reposts: RepostRepository = repostRepository,
    private readonly posts: PostRepository = postRepository,
    private readonly blockRules: BlockService = blockService,
  ) {}

  async repost(userId: string, postId: string) {
    const post = await this.posts.findVisibleActionTarget(postId);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    await this.blockRules.ensureUsersCanInteract(userId, post.user, 'repost');

    const existingRepost = await this.reposts.exists(userId, postId);
    if (existingRepost) {
      throw new ConflictError('Post already reposted');
    }

    await this.reposts.create(userId, postId);
    await this.posts.incrementRepostsCount(postId, 1);

    return { reposted: true };
  }

  async unrepost(userId: string, postId: string) {
    const deletedRepost = await this.reposts.delete(userId, postId);

    if (!deletedRepost) {
      return { reposted: false, alreadyUnreposted: true };
    }

    await this.posts.incrementRepostsCount(postId, -1);

    return { reposted: false, alreadyUnreposted: false };
  }
}

const repostService = new RepostService();

export { RepostService };
export default repostService;

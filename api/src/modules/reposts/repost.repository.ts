import type { Types } from 'mongoose';

import RepostModel, { type RepostDocument } from './repost.model.js';

class RepostRepository {
  exists(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<RepostDocument | null> {
    return RepostModel.findOne({ user: userId, post: postId });
  }

  create(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<RepostDocument> {
    return RepostModel.create({ user: userId, post: postId });
  }

  delete(userId: string | Types.ObjectId, postId: string | Types.ObjectId): Promise<RepostDocument | null> {
    return RepostModel.findOneAndDelete({ user: userId, post: postId });
  }

  async findRepostedPostIds(userId: string | Types.ObjectId, postIds: Types.ObjectId[]) {
    const reposts = await RepostModel.find({ user: userId, post: { $in: postIds } }).select('post').lean();
    return new Set(reposts.map((repost) => repost.post.toString()));
  }

  deleteManyByPost(postId: string | Types.ObjectId) {
    return RepostModel.deleteMany({ post: postId });
  }
}

const repostRepository = new RepostRepository();

export { RepostRepository };
export default repostRepository;

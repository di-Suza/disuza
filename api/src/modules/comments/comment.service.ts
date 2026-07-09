import { Types } from 'mongoose';

import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
import heatmapService, { type HeatmapService } from '../contributions/heatmap.service.js';
import notificationService, { type NotificationService } from '../notifications/notification.service.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import blockService, { type BlockService } from '../users/block/block.service.js';
import commentRepository, { type CommentRepository } from './comment.repository.js';

type CreateCommentInput = {
  postId: string;
  comment: string;
  parentCommentId?: string;
};

type DeleteCommentResult = {
  deletedCount: number;
  parentCommentId: Types.ObjectId | null;
};

class CommentService {
  constructor(
    private readonly comments: CommentRepository = commentRepository,
    private readonly posts: PostRepository = postRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly notifications: NotificationService = notificationService,
    private readonly heatmap: HeatmapService = heatmapService,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback = 10, max = 30): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
  }

  private normalizeComment(comment: unknown): string {
    return typeof comment === 'string' ? comment.trim() : '';
  }

  async createComment(userId: string, input: CreateCommentInput) {
    const post = await this.posts.findVisibleCommentTarget(input.postId);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    await this.blockRules.ensureUsersCanInteract(userId, post.user, 'comment on');

    if (post.settings.commentsDisabled) {
      throw new BadRequestError('Comments are not allowed on this post by author!');
    }

    const commentText = this.normalizeComment(input.comment);

    if (!commentText) {
      throw new BadRequestError('Comment cannot be empty!');
    }

    let parentComment = null;

    if (input.parentCommentId) {
      parentComment = await this.comments.findTopLevelById(input.parentCommentId, input.postId);

      if (!parentComment) {
        throw new NotFoundError('Parent comment not found!');
      }

      await this.blockRules.ensureUsersCanInteract(userId, parentComment.user, 'reply to');
    }

    const newComment = await this.comments.create({
      comment: commentText,
      post: post._id,
      user: new Types.ObjectId(userId),
      postOwner: post.user,
      parentComment: parentComment?._id || null,
      replyToUser: parentComment?.user || null,
    });

    const notificationRecipient = parentComment ? parentComment.user : post.user;
    const notificationType = parentComment ? 'COMMENT_REPLY' : 'COMMENT';

    await Promise.all([
      this.comments.populateAuthor(newComment),
      this.posts.incrementCommentsCount(post._id, 1),
      this.notifications.send({
        senderId: userId,
        recipientId: notificationRecipient,
        type: notificationType,
        contentId: newComment._id,
        onModel: 'Comment',
      }),
      this.heatmap.updateContribution(userId, 'COMMENT', newComment._id, post.user),
      ...(parentComment ? [this.comments.incrementReplyCount(parentComment._id, 1)] : []),
    ]);

    return newComment;
  }

  async getAllComments(postId: string, pageInput: unknown, limitInput: unknown, userId: string) {
    const post = await this.posts.findVisibleCommentTarget(postId);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    await this.blockRules.ensureUsersCanInteract(userId, post.user, 'view comments on');

    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(userId);
    const allComments = await this.comments.getTopLevelComments(
      post._id,
      userId,
      page,
      limit,
      blockedUserIds,
      post.user.toString() === userId.toString(),
    );

    return {
      allComments,
      currentPage: page,
      hasMore: allComments.length === limit,
    };
  }

  async getReplies(commentId: string, pageInput: unknown, limitInput: unknown, userId: string) {
    const parentComment = await this.comments.findTopLevelById(commentId);

    if (!parentComment) {
      throw new NotFoundError('Parent comment not found!');
    }

    const post = await this.posts.findVisibleCommentTarget(parentComment.post);

    if (!post) {
      throw new NotFoundError("Post doesn't exist!");
    }

    await this.blockRules.ensureUsersCanInteract(userId, parentComment.postOwner, 'view replies on');
    await this.blockRules.ensureUsersCanInteract(userId, parentComment.user, 'view replies from');

    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(userId);
    const replies = await this.comments.getReplies(parentComment._id, page, limit, blockedUserIds);

    return {
      replies,
      currentPage: page,
      hasMore: replies.length === limit,
    };
  }

  async deleteComment(userId: string, postId: string, commentId: string): Promise<DeleteCommentResult> {
    const comment = await this.comments.findByIdAndPost(commentId, postId);

    if (!comment) {
      throw new NotFoundError('Comment not found!');
    }

    const isCommentOwner = comment.user.toString() === userId.toString();
    const isPostOwner = comment.postOwner.toString() === userId.toString();

    if (!isCommentOwner && !isPostOwner) {
      throw new ForbiddenError('You are not authorized to delete this comment');
    }

    if (comment.parentComment) {
      await Promise.all([
        this.comments.deleteOne(comment._id),
        this.posts.incrementCommentsCount(postId, -1),
        this.comments.incrementReplyCount(comment.parentComment, -1),
        this.heatmap.removeContribution(comment.user, comment._id, 'COMMENT'),
        this.notifications.removeManyForContent([comment._id], ['COMMENT', 'COMMENT_REPLY']),
      ]);

      return { deletedCount: 1, parentCommentId: comment.parentComment };
    }

    const replies = await this.comments.findReplies(comment._id);
    const commentsToDelete = [comment, ...replies];
    const commentIds = commentsToDelete.map((item) => item._id);

    await Promise.all([
      this.comments.deleteMany(commentIds),
      this.posts.incrementCommentsCount(postId, -commentIds.length),
      ...commentsToDelete.map((item) => this.heatmap.removeContribution(item.user, item._id, 'COMMENT')),
      this.notifications.removeManyForContent(commentIds, ['COMMENT', 'COMMENT_REPLY']),
    ]);

    return { deletedCount: commentIds.length, parentCommentId: null };
  }
}

const commentService = new CommentService();

export { CommentService, type CreateCommentInput, type DeleteCommentResult };
export default commentService;
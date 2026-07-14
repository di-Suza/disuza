import { Worker } from 'bullmq';
import { type Types } from 'mongoose';

import env from '../../config/env.js';
import logger from '../../config/logger.js';
import redisCache from '../cache/redis.js';
import cleanupQueue from './cleanup.queue.js';
import AuthSessionModel from '../../modules/auth/session/authSession.model.js';
import OtpModel from '../../modules/auth/otp.model.js';
import ConversationModel from '../../modules/chat/conversation.model.js';
import MessageModel from '../../modules/chat/message.model.js';
import CollabRoomModel from '../../modules/collab/collabRoom.model.js';
import RoomProblemModel from '../../modules/problems/roomProblem.model.js';
import CommentModel from '../../modules/comments/comment.model.js';
import ContributionLogModel, { type ContributionLog } from '../../modules/contributions/contributionLog.model.js';
import DailyContributionModel, { type ContributionType } from '../../modules/contributions/dailyContribution.model.js';
import IssueModel from '../../modules/issues/issue.model.js';
import LikeModel from '../../modules/likes/like.model.js';
import mediaService from '../../modules/media/media.service.js';
import NotificationModel from '../../modules/notifications/notification.model.js';
import PostModel, { type PostDocument } from '../../modules/posts/post.model.js';
import ReportModel from '../../modules/reports/report.model.js';
import SaveModel from '../../modules/saves/save.model.js';
import SavedCollectionModel from '../../modules/saves/savedCollection.model.js';
import { DEFAULT_SAVE_COVER } from '../../modules/saves/save.constants.js';
import AccountDeletionVerificationModel from '../../modules/users/accountDeletionVerification.model.js';
import BlockModel from '../../modules/users/block/block.model.js';
import FollowModel from '../../modules/users/follow/follow.model.js';
import UserModel from '../../modules/users/user.model.js';
import realtimeService from '../realtime/realtime.service.js';

const typeToContributionField: Record<ContributionType, 'postsCount' | 'commentsCount' | 'feedbackCount'> = {
  POST: 'postsCount',
  COMMENT: 'commentsCount',
  FEEDBACK: 'feedbackCount',
};

let workersStarted = false;
const workers: Worker[] = [];

const toIdString = (id: unknown) => id?.toString() || '';

const buildCounterReset = (field: string, count: number) => ({
  $max: [0, { $subtract: [`$${field}`, count] }],
});

const decrementUserCounter = (userId: string | Types.ObjectId, field: string, count = 1) => UserModel.updateOne(
  { _id: userId },
  [{ $set: { [field]: buildCounterReset(field, count) } }],
);

const decrementPostCounter = (postId: string | Types.ObjectId, field: string, count = 1) => PostModel.updateOne(
  { _id: postId },
  [{ $set: { [`counts.${field}`]: buildCounterReset(`counts.${field}`, count) } }],
);

const decrementDailyContribution = async (
  user: string | Types.ObjectId,
  date: string,
  updates: Partial<Record<'postsCount' | 'commentsCount' | 'feedbackCount', number>> & { totalCount: number },
) => {
  await DailyContributionModel.updateOne(
    { user, date },
    [{
      $set: {
        totalCount: buildCounterReset('totalCount', updates.totalCount),
        postsCount: buildCounterReset('postsCount', updates.postsCount || 0),
        commentsCount: buildCounterReset('commentsCount', updates.commentsCount || 0),
        feedbackCount: buildCounterReset('feedbackCount', updates.feedbackCount || 0),
      },
    }],
  );
};

const removeContributionLogs = async (targetIds: Array<string | Types.ObjectId>, type?: ContributionType) => {
  if (targetIds.length === 0) return;

  const logs = await ContributionLogModel.find({
    targetId: { $in: targetIds },
    ...(type ? { type } : {}),
  }).lean();

  if (logs.length === 0) return;

  const contributionGroups = new Map<string, {
    user: ContributionLog['user'];
    date: string;
    totalCount: number;
    postsCount: number;
    commentsCount: number;
    feedbackCount: number;
  }>();
  const userTotals = new Map<string, number>();

  logs.forEach((log) => {
    const userId = toIdString(log.user);
    const key = `${userId}:${log.dateStr}`;
    const group = contributionGroups.get(key) || {
      user: log.user,
      date: log.dateStr,
      totalCount: 0,
      postsCount: 0,
      commentsCount: 0,
      feedbackCount: 0,
    };

    group.totalCount += 1;
    group[typeToContributionField[log.type]] += 1;
    contributionGroups.set(key, group);
    userTotals.set(userId, (userTotals.get(userId) || 0) + 1);
  });

  await ContributionLogModel.deleteMany({ _id: { $in: logs.map((log) => log._id) } });

  await Promise.all([
    ...[...contributionGroups.values()].map((group) => decrementDailyContribution(group.user, group.date, group)),
    ...[...userTotals.entries()].map(([userId, count]) => decrementUserCounter(userId, 'profileContributions', count)),
  ]);
};

const removeNotifications = async (targetIds: Array<string | Types.ObjectId>, types?: string[]) => {
  if (targetIds.length === 0) return;

  const notifications = await NotificationModel.find({
    contentId: { $in: targetIds },
    ...(types?.length ? { type: { $in: types } } : {}),
  }).select('_id recipient').lean();

  if (notifications.length === 0) return;

  await NotificationModel.deleteMany({ _id: { $in: notifications.map((notification) => notification._id) } });

  notifications.forEach((notification) => {
    realtimeService.emitToUser(notification.recipient.toString(), 'delete_notification', {
      notificationId: notification._id.toString(),
    });
  });
};

const refreshAffectedCollectionCovers = async (saves: Array<{ user: Types.ObjectId; collectionId: Types.ObjectId }>) => {
  const affectedCollections = new Map<string, { owner: Types.ObjectId; collectionId: Types.ObjectId }>();

  saves.forEach((save) => {
    affectedCollections.set(`${toIdString(save.user)}:${toIdString(save.collectionId)}`, {
      owner: save.user,
      collectionId: save.collectionId,
    });
  });

  await Promise.all([...affectedCollections.values()].map(async ({ owner, collectionId }) => {
    const nextSave = await SaveModel.findOne({ user: owner, collectionId }).sort({ createdAt: -1 }).lean();
    let coverImage = DEFAULT_SAVE_COVER;

    if (nextSave) {
      const nextPost = await PostModel.findOne({ _id: nextSave.post, isDeleting: { $ne: true } })
        .select({ media: { $slice: 1 } })
        .lean();
      coverImage = nextPost?.media?.[0]?.url || DEFAULT_SAVE_COVER;
    }

    await SavedCollectionModel.updateOne({ _id: collectionId, owner }, { coverImage });
  }));
};

const refreshConversationsAfterFeedbackCleanup = async (messages: Array<{ conversationId: Types.ObjectId }>) => {
  const conversationIds = [...new Set(messages.map((message) => toIdString(message.conversationId)).filter(Boolean))];

  await Promise.all(conversationIds.map(async (conversationId) => {
    const lastMessage = await MessageModel.findOne({ conversationId })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean();

    await ConversationModel.updateOne(
      { _id: conversationId },
      {
        lastMessage: lastMessage?._id || null,
        isUnread: false,
      },
    );
  }));
};

const adjustOwnerPostCounts = async (post: PostDocument) => {
  if (post.cleanupState?.countsAdjusted) return;

  await Promise.all([
    decrementUserCounter(post.user, 'postsCount'),
    ...(post.isProjectPost ? [decrementUserCounter(post.user, 'projectsCount')] : []),
    PostModel.updateOne({ _id: post._id }, { $set: { 'cleanupState.countsAdjusted': true } }),
  ]);
};

const deletePostMedia = async (post: PostDocument) => {
  await Promise.all((post.media || []).map((media) => mediaService.tryDeleteFile(media.fileId)));
};

const cleanupPost = async (postId: string, userId: string) => {
  const post = await PostModel.findOne({ _id: postId, user: userId });
  if (!post) return;

  const [comments, affectedSaves, feedbackMessages] = await Promise.all([
    CommentModel.find({ post: post._id }).select('_id user').lean(),
    SaveModel.find({ post: post._id }).select('user collectionId').lean(),
    MessageModel.find({
      isFeedback: true,
      'feedbackOn.type': 'Post',
      'feedbackOn._id': post._id,
    }).select('_id conversationId').lean(),
  ]);

  const commentIds = comments.map((comment) => comment._id);
  const feedbackMessageIds = feedbackMessages.map((message) => message._id);
  const contributionTargets = [post._id, ...commentIds, ...feedbackMessageIds];

  await Promise.all([
    adjustOwnerPostCounts(post),
    removeContributionLogs(contributionTargets),
    removeNotifications([post._id, ...commentIds]),
    ReportModel.deleteMany({
      $or: [
        { onModel: 'Post', targetId: post._id },
        { onModel: 'Message', targetId: { $in: feedbackMessageIds } },
      ],
    }),
  ]);

  await Promise.all([
    LikeModel.deleteMany({ post: post._id }),
    CommentModel.deleteMany({ post: post._id }),
    SaveModel.deleteMany({ post: post._id }),
    MessageModel.deleteMany({ _id: { $in: feedbackMessageIds } }),
  ]);

  await refreshConversationsAfterFeedbackCleanup(feedbackMessages);
  await refreshAffectedCollectionCovers(affectedSaves);
  await deletePostMedia(post);
  await PostModel.deleteOne({ _id: post._id });
};

const cleanupFollowCounts = async (userId: string) => {
  const [followingList, followersList] = await Promise.all([
    FollowModel.find({ follower: userId }).select('following').lean(),
    FollowModel.find({ following: userId }).select('follower').lean(),
  ]);

  await Promise.all([
    ...followingList.map((follow) => decrementUserCounter(follow.following, 'followersCount')),
    ...followersList.map((follow) => decrementUserCounter(follow.follower, 'followingCount')),
    FollowModel.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
  ]);
};

const cleanupUserLikes = async (userId: string) => {
  const likes = await LikeModel.find({ user: userId }).select('post').lean();

  await Promise.all([
    ...likes.map((like) => decrementPostCounter(like.post, 'likes')),
    LikeModel.deleteMany({ user: userId }),
  ]);
};

const cleanupCommentTree = async (comment: {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  postOwner: Types.ObjectId;
  user: Types.ObjectId;
  parentComment?: Types.ObjectId | null;
  replyToUser?: Types.ObjectId | null;
}) => {
  if (comment.parentComment) {
    await Promise.all([
      CommentModel.deleteOne({ _id: comment._id }),
      decrementPostCounter(comment.post, 'comments'),
      CommentModel.updateOne(
        { _id: comment.parentComment, replyCount: { $gt: 0 } },
        { $inc: { replyCount: -1 } },
      ),
      removeContributionLogs([comment._id], 'COMMENT'),
      removeNotifications([comment._id], ['COMMENT_REPLY']),
    ]);
    return;
  }

  const replies = await CommentModel.find({ parentComment: comment._id })
    .select('_id user post postOwner replyToUser')
    .lean();
  const commentsToDelete = [comment, ...replies];
  const commentIds = commentsToDelete.map((item) => item._id);

  await Promise.all([
    CommentModel.deleteMany({ _id: { $in: commentIds } }),
    decrementPostCounter(comment.post, 'comments', commentIds.length),
    removeContributionLogs(commentIds, 'COMMENT'),
    removeNotifications(commentIds, ['COMMENT', 'COMMENT_REPLY']),
  ]);
};

const cleanupUserComments = async (userId: string) => {
  const comments = await CommentModel.find({ user: userId })
    .sort({ parentComment: -1 })
    .lean();
  const processed = new Set<string>();

  for (const comment of comments) {
    const commentId = comment._id.toString();

    if (processed.has(commentId)) continue;

    const stillExists = await CommentModel.exists({ _id: comment._id });
    if (!stillExists) continue;

    await cleanupCommentTree(comment);
    processed.add(commentId);
  }
};

const cleanupUserPersonalRooms = async (userId: string) => {
  const personalRooms = await CollabRoomModel.find({ owner: userId, roomType: 'personal' })
    .select('_id')
    .lean();
  const roomIds = personalRooms.map((room) => room._id);

  await Promise.all([
    RoomProblemModel.deleteMany({ roomId: { $in: roomIds } }),
    CollabRoomModel.deleteMany({ _id: { $in: roomIds } }),
  ]);
};

const queueUserPostCleanup = async (userId: string) => {
  const posts = await PostModel.find({ user: userId }).select('_id').lean();

  await Promise.all(posts.map((post) => cleanupQueue.enqueuePostCleanup({
    postId: post._id.toString(),
    userId,
  })));
};

const cleanupProfilePicture = async (profilePicture?: { fileId?: string }) => {
  await mediaService.tryDeleteFile(profilePicture?.fileId);
};

const cleanupUser = async (userId: string, email?: string, profilePicture?: { fileId?: string }) => {
  await Promise.all([
    cleanupFollowCounts(userId),
    cleanupUserLikes(userId),
    cleanupUserComments(userId),
    cleanupUserPersonalRooms(userId),
    queueUserPostCleanup(userId),
    cleanupProfilePicture(profilePicture),
  ]);

  await Promise.all([
    SaveModel.deleteMany({ user: userId }),
    SavedCollectionModel.deleteMany({ owner: userId }),
    BlockModel.deleteMany({ $or: [{ blocker: userId }, { blockedUser: userId }] }),
    NotificationModel.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
    DailyContributionModel.deleteMany({ user: userId }),
    ContributionLogModel.deleteMany({ user: userId }),
    IssueModel.deleteMany({ reporter: userId }),
    ReportModel.deleteMany({ $or: [{ reporter: userId }, { onModel: 'User', targetId: userId }] }),
    AuthSessionModel.deleteMany({ userId }),
    AccountDeletionVerificationModel.deleteMany({ user: userId }),
    email ? OtpModel.deleteMany({ email }) : Promise.resolve(),
    redisCache.deleteKey(`user_:${userId}`),
  ]);

  await UserModel.findByIdAndDelete(userId);
};

const removeMessageContributions = (messageIds: Array<string | Types.ObjectId>) => removeContributionLogs(messageIds, 'FEEDBACK');

const cleanupConversation = async (conversationId: string) => {
  const messages = await MessageModel.find({ conversationId }).select('_id').lean();
  const messageIds = messages.map((message) => message._id);

  await Promise.all([
    removeMessageContributions(messageIds),
    ReportModel.deleteMany({ onModel: 'Message', targetId: { $in: messageIds } }),
  ]);

  await Promise.all([
    MessageModel.deleteMany({ conversationId }),
    ConversationModel.deleteOne({ _id: conversationId }),
  ]);
};

const createWorker = <T>(
  queueName: string,
  processor: (data: T) => Promise<void>,
  concurrency: number,
) => new Worker<T>(
  queueName,
  async (job) => {
    logger.info({ jobId: job.id, queueName }, 'Cleanup job started');
    await processor(job.data);
    logger.info({ jobId: job.id, queueName }, 'Cleanup job completed');
  },
  {
    connection: redisCache.getConnectionOptions() as never,
    concurrency,
  },
);

const startCleanupWorkers = () => {
  if (!env.JOB_WORKERS_ENABLED || workersStarted) return workers;

  if (!redisCache.isEnabled()) {
    logger.warn('Cleanup workers skipped because Redis is disabled');
    return workers;
  }

  workers.push(
    createWorker<{ postId: string; userId: string }>(
      'post-cleanup',
      (data) => cleanupPost(data.postId, data.userId),
      2,
    ),
    createWorker<{ userId: string; email?: string; profilePicture?: { fileId?: string } }>(
      'user-cleanup',
      (data) => cleanupUser(data.userId, data.email, data.profilePicture),
      1,
    ),
    createWorker<{ conversationId: string }>(
      'conversation-cleanup',
      (data) => cleanupConversation(data.conversationId),
      2,
    ),
  );

  workersStarted = true;
  return workers;
};

export { startCleanupWorkers };

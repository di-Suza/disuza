import type { Types } from 'mongoose';

import cleanupQueue, { type CleanupQueue } from '../../infrastructure/jobs/cleanup.queue.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../shared/errors/index.js';
import passwordService from '../../shared/utils/password.js';
import otpRepository, { type OtpRepository } from '../auth/otp.repository.js';
import otpService, { type OtpService } from '../auth/otp.service.js';
import authSessionService, { type AuthSessionService } from '../auth/session/authSession.service.js';
import chatRepository, { type ChatRepository } from '../chat/chat.repository.js';
import commentRepository, { type CommentRepository } from '../comments/comment.repository.js';
import heatmapService, { type HeatmapService } from '../contributions/heatmap.service.js';
import mediaService, { type MediaService } from '../media/media.service.js';
import likeRepository, { type LikeRepository } from '../likes/like.repository.js';
import notificationService, { type NotificationService } from '../notifications/notification.service.js';
import postRepository, { type PostRepository } from '../posts/post.repository.js';
import accountDeletionVerificationRepository, { type AccountDeletionVerificationRepository } from './accountDeletionVerification.repository.js';
import type { ProfilePicture } from './user.model.js';
import userRepository, { type ProfessionalInfoUpdate, type UserRepository } from './user.repository.js';
import blockRepository, { type BlockRepository } from './block/block.repository.js';
import blockService, { type BlockService } from './block/block.service.js';
import followRepository, { type FollowRepository } from './follow/follow.repository.js';

const DEFAULT_PROFILE_PICTURE: ProfilePicture = {
  url: 'https://ik.imagekit.io/disuza/DevloopFeed/ProfilePictures/defaultpp.jpg',
  fileId: '0',
};

const PROFESSIONAL_FIELDS = ['skills', 'experiences', 'educations', 'interests', 'languages'] as const;

type ProfessionalField = typeof PROFESSIONAL_FIELDS[number];

type IdentityUpdateInput = {
  userName?: string;
  ppRemoved?: boolean;
  profilePictureUrl?: string;
  profilePictureFileId?: string;
};

class UserService {
  constructor(
    private readonly users: UserRepository = userRepository,
    private readonly follows: FollowRepository = followRepository,
    private readonly blocks: BlockRepository = blockRepository,
    private readonly blockRules: BlockService = blockService,
    private readonly media: MediaService = mediaService,
    private readonly likes: LikeRepository = likeRepository,
    private readonly posts: PostRepository = postRepository,
    private readonly notifications: NotificationService = notificationService,
    private readonly comments: CommentRepository = commentRepository,
    private readonly chats: ChatRepository = chatRepository,
    private readonly heatmap: HeatmapService = heatmapService,
    private readonly otps: OtpService = otpService,
    private readonly otpRecords: OtpRepository = otpRepository,
    private readonly sessions: AuthSessionService = authSessionService,
    private readonly accountDeletionVerifications: AccountDeletionVerificationRepository = accountDeletionVerificationRepository,
    private readonly cleanupJobs: CleanupQueue = cleanupQueue,
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback: number, max: number): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
  }

  private async getOtpWindowCount(email: string): Promise<number> {
    const otpData = await this.otpRecords.findByEmail(email);

    if (!otpData) return 0;

    const diffInMinutes = Math.floor((Date.now() - otpData.lastResendTime.getTime()) / (1000 * 60));

    if (diffInMinutes >= 10) return 0;

    if (otpData.otpCount >= 3) {
      throw new TooManyRequestsError(`Too many requests. Please try again after ${10 - diffInMinutes} minutes.`);
    }

    return otpData.otpCount;
  }

  private shuffleList<T>(items: T[]): T[] {
    return items
      .map((item) => ({ item, sort: Math.random() }))
      .sort((first, second) => first.sort - second.sort)
      .map(({ item }) => item);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (currentPassword === newPassword) {
      throw new BadRequestError('New password cannot be same as old password');
    }

    const user = await this.users.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundError('User Not Found!');
    }

    if (!user.password && user.isGoogleUser) {
      throw new BadRequestError("Google accounts don't have a password.");
    }

    const isMatch = await passwordService.compare(currentPassword, user.password || '');

    if (!isMatch) {
      throw new BadRequestError('Old password is incorrect');
    }

    const nextPasswordHash = await passwordService.hash(newPassword);
    await this.users.updatePassword(userId, nextPasswordHash);
  }

  async updateUserNameAndPP(userId: string, input: IdentityUpdateInput, file?: Express.Multer.File) {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundError('User Not Found!');
    }

    const updateData: { userName?: string; profilePicture?: ProfilePicture } = {};
    const userName = input.userName?.trim();
    let uploadedProfilePictureFileId: string | undefined;
    let previousProfilePictureFileIdToDelete: string | undefined;

    if (userName && userName !== user.userName) {
      updateData.userName = userName;
    }

    if (file) {
      const uploadedProfilePicture = await this.media.uploadProfilePicture(file, userId);
      uploadedProfilePictureFileId = uploadedProfilePicture.fileId;
      previousProfilePictureFileIdToDelete = this.media.isManagedFileId(user.profilePicture.fileId)
        ? user.profilePicture.fileId
        : undefined;
      updateData.profilePicture = {
        url: uploadedProfilePicture.url,
        fileId: uploadedProfilePicture.fileId,
      };
    } else if (input.ppRemoved) {
      previousProfilePictureFileIdToDelete = this.media.isManagedFileId(user.profilePicture.fileId)
        ? user.profilePicture.fileId
        : undefined;
      updateData.profilePicture = DEFAULT_PROFILE_PICTURE;
    } else if (input.profilePictureUrl) {
      previousProfilePictureFileIdToDelete = this.media.isManagedFileId(user.profilePicture.fileId)
        ? user.profilePicture.fileId
        : undefined;
      updateData.profilePicture = {
        url: input.profilePictureUrl,
        fileId: input.profilePictureFileId || 'external',
      };
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('At least one field (User Name or Profile Picture) must be provided!');
    }

    let updatedUser;

    try {
      updatedUser = await this.users.updateIdentity(userId, updateData);
    } catch (error) {
      await this.media.tryDeleteFile(uploadedProfilePictureFileId);
      throw error;
    }

    if (!updatedUser) {
      await this.media.tryDeleteFile(uploadedProfilePictureFileId);
      throw new NotFoundError('User Not Found!');
    }

    if (previousProfilePictureFileIdToDelete && previousProfilePictureFileIdToDelete !== updatedUser.profilePicture.fileId) {
      await this.media.tryDeleteFile(previousProfilePictureFileIdToDelete);
    }

    return {
      userName: updatedUser.userName,
      profilePicture: updatedUser.profilePicture,
    };
  }

  async updateGeneralInfo(userId: string, headline?: string, about?: string) {
    const updateData: { headline?: string; about?: string } = {};

    if (typeof headline === 'string') {
      updateData.headline = headline.trim();
    }

    if (typeof about === 'string') {
      updateData.about = about.trim();
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('Please provide either headline or about to update!');
    }

    const updatedUser = await this.users.updateGeneralInfo(userId, updateData);

    if (!updatedUser) {
      throw new NotFoundError('User Not Found!');
    }

    return {
      headline: updatedUser.headline,
      about: updatedUser.about,
    };
  }

  async updateProfessionalInfo(userId: string, updates: ProfessionalInfoUpdate) {
    const incomingFields = Object.keys(updates) as ProfessionalField[];
    const isValidOperation = incomingFields.every((field) => PROFESSIONAL_FIELDS.includes(field));

    if (!isValidOperation || incomingFields.length === 0) {
      throw new BadRequestError('Invalid or empty updates!');
    }

    const updatedData = await this.users.updateProfessionalInfo(userId, updates);

    if (!updatedData) {
      throw new NotFoundError('User Not Found!');
    }

    return updatedData;
  }

  async getUserProfile(currentUserId: string, profileUserId: string) {
    if (currentUserId.toString() === profileUserId.toString()) {
      throw new BadRequestError('This Api is not for Current User!');
    }

    const blockStatus = await this.blockRules.getBlockStatus(currentUserId, profileUserId);

    if (blockStatus.hasBlockedMe) {
      throw new NotFoundError("Profile doesn't exist!");
    }

    const [currentUser, profileUser, isFollowed] = await Promise.all([
      this.users.findById(currentUserId),
      this.users.findProfileById(profileUserId),
      this.follows.exists(currentUserId, profileUserId),
    ]);

    if (!currentUser) {
      throw new NotFoundError('User not found!');
    }

    if (!profileUser) {
      throw new NotFoundError('User not found!');
    }

    if (blockStatus.isBlocked) {
      return {
        success: true,
        message: 'Profile User Fetched Successfully!',
        blockedProfile: true,
        profileUser: {
          _id: profileUser._id,
          userName: profileUser.userName,
          profilePicture: profileUser.profilePicture,
          isFollowed: false,
          isBlocked: true,
          hasBlockedMe: false,
          blockedProfile: true,
        },
      };
    }

    const [userPosts, heatmap] = await Promise.all([
      profileUser.postsCount > 0 ? this.posts.findProfilePosts(profileUserId) : Promise.resolve([]),
      this.heatmap.getHeatmap(profileUserId),
    ]);
    const normalPosts = userPosts.filter((post) => post.isProjectPost === false);
    const projectPosts = userPosts.filter((post) => post.isProjectPost === true);

    return {
      success: true,
      message: 'Profile User Fetched Successfully!',
      profileUser: {
        ...profileUser.toObject(),
        heatmap,
        isFollowed: Boolean(isFollowed),
        isBlocked: false,
        hasBlockedMe: false,
      },
      normalPosts,
      projectPosts,
    };
  }

  async followUser(userId: string, followUserId: string) {
    if (userId.toString() === followUserId.toString()) {
      throw new BadRequestError('You cannot follow yourself!');
    }

    await this.blockRules.ensureUsersCanInteract(userId, followUserId, 'follow');

    const targetUser = await this.users.findById(followUserId);

    if (!targetUser) {
      throw new NotFoundError('User not found!');
    }

    const existingFollow = await this.follows.findOne(userId, followUserId);

    if (existingFollow) {
      return { alreadyFollowing: true };
    }

    await Promise.all([
      this.follows.create(userId, followUserId),
      this.users.incrementCounter(userId, 'followingCount', 1),
      this.users.incrementCounter(followUserId, 'followersCount', 1),
    ]);

    await this.notifications.send({
      senderId: userId,
      recipientId: followUserId,
      type: 'FOLLOW',
      contentId: followUserId,
      onModel: 'User',
    });

    return { alreadyFollowing: false };
  }

  async unfollowUser(userId: string, followUserId: string) {
    const deletedFollow = await this.follows.deleteOne(userId, followUserId);

    if (!deletedFollow) {
      throw new BadRequestError('You are not following this user!');
    }

    await Promise.all([
      this.users.incrementCounter(userId, 'followingCount', -1),
      this.users.incrementCounter(followUserId, 'followersCount', -1),
      this.notifications.remove({
        senderId: userId,
        recipientId: followUserId,
        type: 'FOLLOW',
        contentId: followUserId,
      }),
    ]);
  }
  async getFollowers(currentUserId: string, userId: string, pageInput: unknown, limitInput: unknown) {
    await this.blockRules.ensureUsersCanInteract(currentUserId, userId, 'view followers of');

    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput, 15, 30);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(currentUserId);

    return this.follows.getFollowers(userId, blockedUserIds, page, limit);
  }

  async getFollowing(currentUserId: string, userId: string, pageInput: unknown, limitInput: unknown) {
    await this.blockRules.ensureUsersCanInteract(currentUserId, userId, 'view following of');

    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput, 15, 30);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(currentUserId);

    return this.follows.getFollowing(userId, blockedUserIds, page, limit);
  }

  private async cleanupFollowBetweenUsers(userId: string, targetUserId: string) {
    const [currentFollowsTarget, targetFollowsCurrent] = await this.follows.deleteBetweenUsers(userId, targetUserId);
    const cleanupTasks: Array<Promise<unknown>> = [];

    if (currentFollowsTarget) {
      cleanupTasks.push(
        this.users.incrementCounter(userId, 'followingCount', -1),
        this.users.incrementCounter(targetUserId, 'followersCount', -1),
        this.notifications.remove({
          senderId: userId,
          recipientId: targetUserId,
          type: 'FOLLOW',
          contentId: targetUserId,
        }),
      );
    }

    if (targetFollowsCurrent) {
      cleanupTasks.push(
        this.users.incrementCounter(targetUserId, 'followingCount', -1),
        this.users.incrementCounter(userId, 'followersCount', -1),
        this.notifications.remove({
          senderId: targetUserId,
          recipientId: userId,
          type: 'FOLLOW',
          contentId: userId,
        }),
      );
    }

    await Promise.all(cleanupTasks);

    return {
      removedCurrentFollowsTarget: Boolean(currentFollowsTarget),
      removedTargetFollowsCurrent: Boolean(targetFollowsCurrent),
    };
  }
  async blockUser(userId: string, blockedUserId: string) {
    if (userId.toString() === blockedUserId.toString()) {
      throw new BadRequestError('You cannot block yourself!');
    }

    const targetUser = await this.users.findById(blockedUserId);

    if (!targetUser) {
      throw new NotFoundError('User not found!');
    }

    const existingBlock = await this.blocks.findOne(userId, blockedUserId);

    if (existingBlock) {
      return {
        block: existingBlock,
        alreadyBlocked: true,
        followCleanup: {
          removedCurrentFollowsTarget: false,
          removedTargetFollowsCurrent: false,
        },
      };
    }

    const block = await this.blocks.create(userId, blockedUserId);
    const followCleanup = await this.cleanupFollowBetweenUsers(userId, blockedUserId);

    return { block, alreadyBlocked: false, followCleanup };
  }

  async unblockUser(userId: string, blockedUserId: string) {
    if (userId.toString() === blockedUserId.toString()) {
      throw new BadRequestError('You cannot unblock yourself!');
    }

    const deletedBlock = await this.blocks.deleteOne(userId, blockedUserId);

    if (!deletedBlock) {
      throw new BadRequestError('This user is not blocked!');
    }
  }

  async getBlockedUsers(userId: string, pageInput: unknown, limitInput: unknown) {
    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput, 15, 30);
    const { blockedUsers, totalBlockedUsers } = await this.blocks.getBlockedUsers(userId, page, limit);

    return {
      blockedUsers,
      page,
      totalBlockedUsers,
      hasMore: (page - 1) * limit + blockedUsers.length < totalBlockedUsers,
    };
  }

  async getUserRecommendations(userId: string, limitInput: unknown) {
    const safeLimit = this.normalizeLimit(limitInput, 12, 20);
    const [followingList, followersList, blockedUserIds] = await Promise.all([
      this.follows.findFollowingIds(userId),
      this.follows.findFollowerIds(userId),
      this.blockRules.getBlockedUserIds(userId),
    ]);

    const followingIds = followingList.map((item) => item.following);
    const followerIds = followersList.map((item) => item.follower);
    const followingIdSet = new Set(followingIds.map((id) => id.toString()));
    const followerIdStrings = [...new Set(followerIds.map((id) => id.toString()))];
    const followerIdSet = new Set(followerIdStrings);
    const blockedUserIdSet = new Set(blockedUserIds.map((id) => id.toString()));
    const excludedIds = new Set([userId.toString(), ...blockedUserIdSet, ...followingIdSet]);

    let recommendedIds: string[] = [];

    if (followerIdStrings.length > 0) {
      const mutualRelations = await this.follows.findMutualRelations(followerIdStrings, 300);
      const scoreMap = new Map<string, number>();

      mutualRelations.forEach((relation) => {
        const followerId = relation.follower.toString();
        const followingId = relation.following.toString();

        if (followerIdSet.has(followerId) && !excludedIds.has(followingId)) {
          scoreMap.set(followingId, (scoreMap.get(followingId) || 0) + 1);
        }

        if (followerIdSet.has(followingId) && !excludedIds.has(followerId)) {
          scoreMap.set(followerId, (scoreMap.get(followerId) || 0) + 1);
        }
      });

      recommendedIds = [...scoreMap.entries()]
        .sort((first, second) => second[1] - first[1])
        .map(([id]) => id);
    }

    recommendedIds = recommendedIds.filter((id) => !excludedIds.has(id));

    if (recommendedIds.length > 0) {
      const limitedIds = this.shuffleList(recommendedIds).slice(0, safeLimit);
      const users = await this.users.findRecommendationUsers(limitedIds, safeLimit);
      const userMap = new Map(users.map((user) => [user._id.toString(), user]));

      return limitedIds.map((id) => userMap.get(id)).filter(Boolean);
    }

    return this.users.findFallbackRecommendations([...excludedIds], safeLimit);
  }

  async getUserAccountHistory(userId: string, type: string, pageInput: unknown, limitInput: unknown) {
    const supportedTypes = ['likes', 'comments', 'follows', 'feedbacks'];

    if (!supportedTypes.includes(type)) {
      throw new BadRequestError('Invalid Type');
    }

    const page = this.normalizePage(pageInput);
    const limit = this.normalizeLimit(limitInput, 10, 20);
    const blockedUserIds = await this.blockRules.getBlockedUserIds(userId);
    const blockedUserIdSet = new Set(blockedUserIds.map((id) => id.toString()));

    if (type === 'follows') {
      return this.follows.findFollowingActivity(userId, blockedUserIds, page, limit);
    }

    if (type === 'comments') {
      const comments = await this.comments.findUserActivity(userId, page, limit);
      return comments.filter((activity) => {
        const post = activity.post as { user?: Types.ObjectId | string } | null | undefined;
        if (!post?.user) return false;
        return !blockedUserIdSet.has(post.user.toString());
      });
    }

    if (type === 'feedbacks') {
      const feedbacks = await this.chats.findFeedbackActivity(userId, page, limit);

      return feedbacks.map((activity) => {
        const normalizedActivity = { ...activity } as Record<string, unknown>;
        const feedbackOn = normalizedActivity.feedbackOn as { _id?: unknown; type?: string } | undefined;

        if (feedbackOn?._id) {
          const { _id: feedbackDetails, ...restFeedbackOn } = feedbackOn;
          normalizedActivity.feedbackDetails = feedbackDetails;
          normalizedActivity.feedbackOn = restFeedbackOn;
        }

        return normalizedActivity;
      });
    }

    const likes = await this.likes.findUserActivity(userId, page, limit);
    const populatedLikes = likes as Array<{ post?: { user?: Types.ObjectId | string } | null }>;

    return populatedLikes.filter((activity) => {
      const post = activity.post as { user?: Types.ObjectId | string } | null | undefined;
      if (!post?.user) return false;
      return !blockedUserIdSet.has(post.user.toString());
    });
  }

  async verifyAccountDeletePassword(userId: string, password: string) {
    const user = await this.users.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundError('Account not found.');
    }

    if (!user.password && user.isGoogleUser) {
      throw new BadRequestError('Google accounts do not have a password to verify.');
    }

    const isMatch = await passwordService.compare(password, user.password || '');

    if (!isMatch) {
      throw new UnauthorizedError('Password is incorrect.');
    }

    await this.accountDeletionVerifications.upsert(userId, 'password');

    return true;
  }

  async sendAccountDeleteOtp(userId: string) {
    const user = await this.users.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundError('Account not found.');
    }

    if (!user.isGoogleUser || user.password) {
      throw new BadRequestError('OTP delete verification is only for Google accounts.');
    }

    const currentCount = await this.getOtpWindowCount(user.email);
    const updatedOtpRecord = await this.otps.sendAndSaveOtp(user.email, currentCount);

    return {
      email: user.email,
      otpCount: updatedOtpRecord.otpCount,
    };
  }

  async verifyAccountDeleteOtp(userId: string, otp: string) {
    const user = await this.users.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundError('Account not found.');
    }

    if (!user.isGoogleUser || user.password) {
      throw new BadRequestError('OTP delete verification is only for Google accounts.');
    }

    const { otpMatched, verifyAttempts } = await this.otps.verifyOtp(user.email, otp);

    if (!otpMatched) {
      await this.otpRecords.incrementVerifyAttempts(user.email, verifyAttempts + 1);
      throw new UnauthorizedError('OTP not matched!');
    }

    await Promise.all([
      this.otpRecords.deleteByEmail(user.email),
      this.accountDeletionVerifications.upsert(userId, 'otp'),
    ]);

    return true;
  }

  async deleteUserAccount(userId: string) {
    const verified = await this.accountDeletionVerifications.findValid(userId);

    if (!verified) {
      throw new ForbiddenError('Please verify your account before deleting it.');
    }

    const user = await this.users.markInactive(userId);

    if (!user) {
      throw new NotFoundError('Account not found or already deleted.');
    }

    await Promise.all([
      this.accountDeletionVerifications.deleteByUser(userId),
      this.posts.markUserPostsDeleting(user._id),
      this.sessions.revokeAllUserSessions(userId, 'LOGOUT_ALL'),
    ]);

    await this.cleanupJobs.enqueueUserCleanup({
      userId: user._id.toString(),
      email: user.email,
      profilePicture: user.profilePicture,
    });
  }
}

const userService = new UserService();

export { UserService };
export default userService;

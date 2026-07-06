import type { Types } from 'mongoose';

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/index.js';
import passwordService from '../../shared/utils/password.js';
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
  ) {}

  private normalizePage(pageInput: unknown): number {
    const page = Number(pageInput) || 1;
    return Math.max(page, 1);
  }

  private normalizeLimit(limitInput: unknown, fallback: number, max: number): number {
    const limit = Number(limitInput) || fallback;
    return Math.min(Math.max(limit, 1), max);
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

  async updateUserNameAndPP(userId: string, input: IdentityUpdateInput) {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundError('User Not Found!');
    }

    const updateData: { userName?: string; profilePicture?: ProfilePicture } = {};
    const userName = input.userName?.trim();

    if (userName && userName !== user.userName) {
      updateData.userName = userName;
    }

    if (input.ppRemoved) {
      updateData.profilePicture = DEFAULT_PROFILE_PICTURE;
    }

    if (input.profilePictureUrl) {
      updateData.profilePicture = {
        url: input.profilePictureUrl,
        fileId: input.profilePictureFileId || 'external',
      };
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('At least one field (User Name or Profile Picture) must be provided!');
    }

    const updatedUser = await this.users.updateIdentity(userId, updateData);

    if (!updatedUser) {
      throw new NotFoundError('User Not Found!');
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

    return {
      success: true,
      message: 'Profile User Fetched Successfully!',
      profileUser: {
        ...profileUser.toObject(),
        isFollowed: Boolean(isFollowed),
        isBlocked: false,
        hasBlockedMe: false,
      },
      normalPosts: [],
      projectPosts: [],
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
      );
    }

    if (targetFollowsCurrent) {
      cleanupTasks.push(
        this.users.incrementCounter(targetUserId, 'followingCount', -1),
        this.users.incrementCounter(userId, 'followersCount', -1),
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

  getUserAccountHistory(_userId: string, type: string) {
    const supportedTypes = ['likes', 'comments', 'follows', 'feedbacks'];

    if (!supportedTypes.includes(type)) {
      throw new BadRequestError('Invalid Type');
    }

    return [];
  }

  verifyAccountDeletePassword(): never {
    throw new ConflictError('Account deletion flow will be enabled after cleanup queue infrastructure is added.');
  }

  sendAccountDeleteOtp(): never {
    throw new ConflictError('Account deletion OTP flow will be enabled after cleanup queue infrastructure is added.');
  }

  verifyAccountDeleteOtp(): never {
    throw new ConflictError('Account deletion OTP flow will be enabled after cleanup queue infrastructure is added.');
  }

  deleteUserAccount(): never {
    throw new UnauthorizedError('Account deletion is disabled until cleanup queue infrastructure is added.');
  }
}

const userService = new UserService();

export { UserService };
export default userService;

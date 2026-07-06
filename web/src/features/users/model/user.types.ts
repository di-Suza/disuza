import type { AuthUser, ProfilePicture } from '@/features/auth/model/auth.types';
import type { Post } from '@/features/posts/model/post.types';

export type PortfolioExperience = {
  companyName: string;
  timePeriod: string;
};

export type PortfolioEducation = {
  collegeName: string;
  timePeriod: string;
  course: string;
};

export type UserProfile = AuthUser & {
  headline?: string;
  about?: string;
  skills?: string[];
  experiences?: PortfolioExperience[];
  educations?: PortfolioEducation[];
  interests?: string[];
  languages?: string[];
  followersCount?: number;
  followingCount?: number;
  projectsCount?: number;
  postsCount?: number;
  profileContributions?: number;
  isFollowed?: boolean;
  isBlocked?: boolean;
  hasBlockedMe?: boolean;
  blockedProfile?: boolean;
};

export type UpdatePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type UpdateIdentityRequest = {
  userName?: string;
  ppRemoved?: boolean;
  profilePictureUrl?: string;
  profilePictureFileId?: string;
};

export type UpdateIdentityResponse = {
  userName: string;
  profilePicture: ProfilePicture;
};

export type UpdateGeneralInfoRequest = {
  headline?: string;
  about?: string;
};

export type UpdateGeneralInfoResponse = {
  headline: string;
  about: string;
};

export type UpdateProfessionalInfoRequest = Partial<{
  skills: string[];
  experiences: PortfolioExperience[];
  educations: PortfolioEducation[];
  interests: string[];
  languages: string[];
}>;

export type ProfileUserResponse = {
  success: boolean;
  message: string;
  profileUser: UserProfile;
  blockedProfile?: boolean;
  normalPosts?: Post[];
  projectPosts?: Post[];
};

export type UserListResponse = {
  success: boolean;
  message: string;
  count: number;
  hasMore: boolean;
};

export type FollowersResponse = UserListResponse & {
  followers: UserProfile[];
};

export type FollowingResponse = UserListResponse & {
  following: UserProfile[];
};

export type BlockedUserItem = {
  _id: string;
  blockedUser?: UserProfile;
  createdAt?: string;
};

export type BlockedUsersResponse = {
  success: boolean;
  message: string;
  blockedUsers: BlockedUserItem[];
  page: number;
  totalBlockedUsers: number;
  hasMore: boolean;
};

export type RecommendationsResponse = {
  success: boolean;
  message: string;
  recommendations: UserProfile[];
};

export type ActivityHistoryResponse = {
  success: boolean;
  activities: unknown[];
  hasMore: boolean;
};

export type MessageResponse = {
  success?: boolean;
  message: string;
};

export type BlockUserResponse = MessageResponse & {
  alreadyBlocked?: boolean;
  followCleanup?: {
    removedCurrentFollowsTarget: boolean;
    removedTargetFollowsCurrent: boolean;
  };
};

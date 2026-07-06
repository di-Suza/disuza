import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import {
  useBlockUserMutation,
  useFollowUserMutation,
  useGetFollowersQuery,
  useGetFollowingQuery,
  useGetProfileUserQuery,
  useUnblockUserMutation,
  useUnfollowUserMutation,
} from '@/features/users/api/user.api';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type RelationshipListMode = 'followers' | 'following';

export const useProfilePage = () => {
  const navigate = useNavigate();
  const { id: profileUserId = '' } = useParams();
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const isOwnProfile = Boolean(currentUserId && profileUserId === currentUserId);
  const { showError, showSuccess } = useToast();

  const [listMode, setListMode] = useState<RelationshipListMode>('followers');
  const [isListOpen, setListOpen] = useState(false);

  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useGetProfileUserQuery(profileUserId, {
    skip: !profileUserId || isOwnProfile,
  });

  const profileUser = data?.profileUser || null;
  const [followUser, { isLoading: isFollowLoading }] = useFollowUserMutation();
  const [unfollowUser, { isLoading: isUnfollowLoading }] = useUnfollowUserMutation();
  const [blockUser, { isLoading: isBlockLoading }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblockLoading }] = useUnblockUserMutation();

  const followersQuery = useGetFollowersQuery(
    { userId: profileUserId, page: 1 },
    { skip: !isListOpen || listMode !== 'followers' || !profileUserId },
  );
  const followingQuery = useGetFollowingQuery(
    { userId: profileUserId, page: 1 },
    { skip: !isListOpen || listMode !== 'following' || !profileUserId },
  );

  const openList = useCallback((mode: RelationshipListMode) => {
    setListMode(mode);
    setListOpen(true);
  }, []);

  const closeList = useCallback(() => setListOpen(false), []);

  const handleFollowToggle = useCallback(async () => {
    if (!profileUser) return;

    try {
      const result = profileUser.isFollowed
        ? await unfollowUser(profileUser._id).unwrap()
        : await followUser(profileUser._id).unwrap();
      showSuccess(result.message);
    } catch (apiError) {
      showError(getErrorMessage(apiError));
    }
  }, [followUser, profileUser, showError, showSuccess, unfollowUser]);

  const handleBlockToggle = useCallback(async () => {
    if (!profileUser) return;

    try {
      const result = profileUser.isBlocked
        ? await unblockUser(profileUser._id).unwrap()
        : await blockUser(profileUser._id).unwrap();
      showSuccess(result.message);
    } catch (apiError) {
      showError(getErrorMessage(apiError));
    }
  }, [blockUser, profileUser, showError, showSuccess, unblockUser]);

  const goToDashboard = useCallback(() => navigate('/dashboard', { replace: true }), [navigate]);

  return useMemo(() => ({
    closeList,
    currentUserId,
    error,
    followers: followersQuery.data?.followers || [],
    followersCount: profileUser?.followersCount || 0,
    following: followingQuery.data?.following || [],
    followingCount: profileUser?.followingCount || 0,
    goToDashboard,
    handleBlockToggle,
    handleFollowToggle,
    isBlockLoading,
    isFetching,
    isFollowLoading,
    isListFetching: followersQuery.isFetching || followingQuery.isFetching,
    isListOpen,
    isLoading,
    isMutating: isFollowLoading || isUnfollowLoading || isBlockLoading || isUnblockLoading,
    isOwnProfile,
    isProfileError: isError,
    listMode,
    normalPosts: data?.normalPosts || [],
    openList,
    profileUser,
    profileUserId,
    projectPosts: data?.projectPosts || [],
    refetch,
  }), [
    closeList,
    currentUserId,
    data?.normalPosts,
    data?.projectPosts,
    error,
    followersQuery.data?.followers,
    followersQuery.isFetching,
    followingQuery.data?.following,
    followingQuery.isFetching,
    goToDashboard,
    handleBlockToggle,
    handleFollowToggle,
    isBlockLoading,
    isError,
    isFetching,
    isFollowLoading,
    isListOpen,
    isLoading,
    isOwnProfile,
    isUnblockLoading,
    isUnfollowLoading,
    listMode,
    openList,
    profileUser,
    profileUserId,
    refetch,
  ]);
};

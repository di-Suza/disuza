import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { UserProfile } from '@/features/users/model/user.types';
import useDebounce from '@/shared/hooks/useDebounce';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type RelationshipListMode = 'followers' | 'following';

const FOLLOW_DEBOUNCE_MS = 600;

type FollowState = {
  userId: string;
  isFollowed: boolean;
  followersCount: number;
};

const getProfileFollowState = (profileUser: UserProfile): FollowState => ({
  userId: profileUser._id,
  isFollowed: Boolean(profileUser.isFollowed),
  followersCount: Number(profileUser.followersCount || 0),
});

const getNextFollowState = (state: FollowState): FollowState => {
  const nextFollowed = !state.isFollowed;
  const delta = nextFollowed ? 1 : -1;

  return {
    ...state,
    isFollowed: nextFollowed,
    followersCount: Math.max(0, state.followersCount + delta),
  };
};

export const useProfilePage = () => {
  const navigate = useNavigate();
  const { id: profileUserId = '' } = useParams();
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const isOwnProfile = Boolean(currentUserId && profileUserId === currentUserId);
  const { showError, showSuccess } = useToast();

  const [listMode, setListMode] = useState<RelationshipListMode>('followers');
  const [isListOpen, setListOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);

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
  const [followState, setFollowState] = useState<FollowState | null>(null);
  const debouncedFollowState = useDebounce(followState, FOLLOW_DEBOUNCE_MS);
  const originalFollowStateRef = useRef<FollowState | null>(null);

  useEffect(() => {
    if (!profileUser?._id) {
      originalFollowStateRef.current = null;
      setFollowState(null);
      return;
    }

    const nextState = getProfileFollowState(profileUser);
    originalFollowStateRef.current = nextState;
    setFollowState(nextState);
  }, [profileUser?._id]);

  useEffect(() => {
    if (!debouncedFollowState) return;

    const previousState = originalFollowStateRef.current;
    if (!previousState || previousState.userId !== debouncedFollowState.userId) return;
    if (debouncedFollowState.isFollowed === previousState.isFollowed) return;

    originalFollowStateRef.current = debouncedFollowState;

    const request = debouncedFollowState.isFollowed
      ? followUser(debouncedFollowState.userId).unwrap()
      : unfollowUser(debouncedFollowState.userId).unwrap();

    request
      .then((result) => showSuccess(result.message))
      .catch((apiError) => {
        originalFollowStateRef.current = previousState;
        setFollowState((currentState) => (
          currentState?.userId === debouncedFollowState.userId &&
          currentState.isFollowed === debouncedFollowState.isFollowed
            ? previousState
            : currentState
        ));
        showError(getErrorMessage(apiError));
      });
  }, [debouncedFollowState, followUser, showError, showSuccess, unfollowUser]);

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
  const openReport = useCallback(() => setReportOpen(true), []);
  const closeReport = useCallback(() => setReportOpen(false), []);

  const handleFollowToggle = useCallback(() => {
    if (!profileUser) return;

    setFollowState((currentState) => {
      const baseState = currentState?.userId === profileUser._id
        ? currentState
        : getProfileFollowState(profileUser);

      return getNextFollowState(baseState);
    });
  }, [profileUser]);

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
  const displayProfileUser = useMemo(() => {
    if (!profileUser) return null;
    if (!followState || followState.userId !== profileUser._id) return profileUser;

    return {
      ...profileUser,
      isFollowed: followState.isFollowed,
      followersCount: followState.followersCount,
    };
  }, [followState, profileUser]);

  return useMemo(() => ({
    closeList,
    closeReport,
    currentUserId,
    error,
    followers: followersQuery.data?.followers || [],
    followersCount: displayProfileUser?.followersCount || 0,
    following: followingQuery.data?.following || [],
    followingCount: displayProfileUser?.followingCount || 0,
    goToDashboard,
    handleBlockToggle,
    handleFollowToggle,
    isBlockLoading,
    isFetching,
    isFollowLoading,
    isListFetching: followersQuery.isFetching || followingQuery.isFetching,
    isListOpen,
    isLoading,
    isReportOpen,
    isMutating: isBlockLoading || isUnblockLoading,
    isOwnProfile,
    isProfileError: isError,
    listMode,
    normalPosts: data?.normalPosts || [],
    openList,
    openReport,
    profileUser: displayProfileUser,
    profileUserId,
    projectPosts: data?.projectPosts || [],
    refetch,
  }), [
    closeList,
    closeReport,
    currentUserId,
    data?.normalPosts,
    data?.projectPosts,
    displayProfileUser,
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
    isReportOpen,
    isOwnProfile,
    isUnblockLoading,
    isUnfollowLoading,
    listMode,
    openList,
    openReport,
    profileUserId,
    refetch,
  ]);
};

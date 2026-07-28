import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRepostPostMutation, useUnrepostPostMutation } from '@/features/posts/api/post.api';
import type { Post } from '@/features/posts/model/post.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type PostRepostState = {
  postId: string;
  isReposted: boolean;
  repostsCount: number;
};

const getPostRepostState = (post: Post): PostRepostState => ({
  postId: post._id,
  isReposted: Boolean(post.isReposted),
  repostsCount: Number(post.counts?.reposts || 0),
});

const getNextRepostState = (state: PostRepostState, reposted: boolean): PostRepostState => {
  const delta = reposted ? (state.isReposted ? 0 : 1) : state.isReposted ? -1 : 0;

  return {
    ...state,
    isReposted: reposted,
    repostsCount: Math.max(0, state.repostsCount + delta),
  };
};

export const usePostRepost = (post: Post) => {
  const { showError } = useToast();
  const [repostPost, { isLoading: isReposting }] = useRepostPostMutation();
  const [unrepostPost, { isLoading: isUnreposting }] = useUnrepostPostMutation();
  const [repostState, setRepostState] = useState<PostRepostState>(() => getPostRepostState(post));
  const pendingRepostRef = useRef(false);

  const isRepostUpdating = isReposting || isUnreposting;

  useEffect(() => {
    setRepostState((currentState) => {
      if (pendingRepostRef.current && currentState.postId === post._id) return currentState;
      return getPostRepostState(post);
    });
  }, [post._id, post.isReposted, post.counts?.reposts]);

  const toggleRepost = useCallback(async () => {
    if (!post._id || pendingRepostRef.current) return false;

    const previousState = repostState;
    const nextReposted = !previousState.isReposted;
    pendingRepostRef.current = true;
    setRepostState(getNextRepostState(previousState, nextReposted));

    try {
      if (nextReposted) {
        await repostPost(post._id).unwrap();
      } else {
        await unrepostPost(post._id).unwrap();
      }
      return true;
    } catch (error) {
      setRepostState(previousState);
      showError(getErrorMessage(error, 'Repost update failed.'));
      return false;
    } finally {
      pendingRepostRef.current = false;
    }
  }, [post._id, repostPost, repostState, showError, unrepostPost]);

  return useMemo(() => ({
    isReposted: repostState.isReposted,
    isRepostUpdating,
    repostsCount: repostState.repostsCount,
    toggleRepost,
  }), [isRepostUpdating, repostState.isReposted, repostState.repostsCount, toggleRepost]);
};

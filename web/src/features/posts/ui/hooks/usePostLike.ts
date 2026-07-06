import { useCallback, useEffect, useState } from 'react';

import { useLikePostMutation, useUnlikePostMutation } from '@/features/posts/api/post.api';
import type { Post } from '@/features/posts/model/post.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type PostLikeState = {
  isLiked: boolean;
  likesCount: number;
};

const getPostLikeState = (post: Post): PostLikeState => ({
  isLiked: Boolean(post.isLiked),
  likesCount: Number(post.counts?.likes || 0),
});

const getNextLikeState = (state: PostLikeState, liked: boolean): PostLikeState => {
  const delta = liked ? (state.isLiked ? 0 : 1) : state.isLiked ? -1 : 0;

  return {
    isLiked: liked,
    likesCount: Math.max(0, state.likesCount + delta),
  };
};

export const usePostLike = (post: Post) => {
  const { showError } = useToast();
  const [likePost, { isLoading: isLiking }] = useLikePostMutation();
  const [unlikePost, { isLoading: isUnliking }] = useUnlikePostMutation();
  const [likeState, setLikeState] = useState<PostLikeState>(() => getPostLikeState(post));

  useEffect(() => {
    setLikeState(getPostLikeState(post));
  }, [post._id, post.isLiked, post.counts?.likes]);

  const isLikeUpdating = isLiking || isUnliking;

  const toggleLike = useCallback(async () => {
    if (!post._id || isLikeUpdating) return;

    const previousState = likeState;
    const nextLiked = !previousState.isLiked;
    setLikeState(getNextLikeState(previousState, nextLiked));

    try {
      if (nextLiked) {
        await likePost(post._id).unwrap();
      } else {
        await unlikePost(post._id).unwrap();
      }
    } catch (error) {
      setLikeState(previousState);
      showError(getErrorMessage(error));
    }
  }, [isLikeUpdating, likePost, likeState, post._id, showError, unlikePost]);

  return {
    isLiked: likeState.isLiked,
    likesCount: likeState.likesCount,
    isLikeUpdating,
    toggleLike,
  };
};
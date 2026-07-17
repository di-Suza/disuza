import { useCallback, useEffect, useRef, useState } from 'react';

import { useLikePostMutation, useUnlikePostMutation } from '@/features/posts/api/post.api';
import type { Post } from '@/features/posts/model/post.types';
import useDebounce from '@/shared/hooks/useDebounce';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const LIKE_DEBOUNCE_MS = 600;

type PostLikeState = {
  postId: string;
  isLiked: boolean;
  likesCount: number;
};

const getPostLikeState = (post: Post): PostLikeState => ({
  postId: post._id,
  isLiked: Boolean(post.isLiked),
  likesCount: Number(post.counts?.likes || 0),
});

const getNextLikeState = (state: PostLikeState, liked: boolean): PostLikeState => {
  const delta = liked ? (state.isLiked ? 0 : 1) : state.isLiked ? -1 : 0;

  return {
    ...state,
    isLiked: liked,
    likesCount: Math.max(0, state.likesCount + delta),
  };
};

export const usePostLike = (post: Post) => {
  const { showError } = useToast();
  const [likePost, { isLoading: isLiking }] = useLikePostMutation();
  const [unlikePost, { isLoading: isUnliking }] = useUnlikePostMutation();
  const [likeState, setLikeState] = useState<PostLikeState>(() => getPostLikeState(post));
  const debouncedLikeState = useDebounce(likeState, LIKE_DEBOUNCE_MS);
  const originalLikeStateRef = useRef<PostLikeState>(getPostLikeState(post));

  useEffect(() => {
    const nextState = getPostLikeState(post);
    originalLikeStateRef.current = nextState;
    setLikeState(nextState);
  }, [post._id]);

  const isLikeUpdating = isLiking || isUnliking;

  useEffect(() => {
    if (!post._id) return;

    const previousState = originalLikeStateRef.current;
    if (debouncedLikeState.postId !== post._id || previousState.postId !== post._id) return;
    if (debouncedLikeState.isLiked === previousState.isLiked) return;

    const nextState = getNextLikeState(previousState, debouncedLikeState.isLiked);
    originalLikeStateRef.current = nextState;

    const request = debouncedLikeState.isLiked ? likePost(post._id).unwrap() : unlikePost(post._id).unwrap();

    request.catch((error) => {
      originalLikeStateRef.current = previousState;
      setLikeState((currentState) => (
        currentState.postId === debouncedLikeState.postId &&
        currentState.isLiked === debouncedLikeState.isLiked
          ? previousState
          : currentState
      ));
      showError(getErrorMessage(error));
    });
  }, [debouncedLikeState, likePost, post._id, showError, unlikePost]);

  const toggleLike = useCallback(() => {
    if (!post._id) return;

    setLikeState((currentState) => getNextLikeState(currentState, !currentState.isLiked));
  }, [post._id]);

  useEffect(() => {
    setLikeState((currentState) => {
      if (currentState.postId !== post._id) return currentState;
      if (currentState.isLiked !== originalLikeStateRef.current.isLiked) {
        return currentState;
      }

      const nextLikesCount = Number(post.counts?.likes || 0);
      return currentState.likesCount === nextLikesCount ? currentState : { ...currentState, likesCount: nextLikesCount };
    });
  }, [post.counts?.likes]);

  return {
    isLiked: likeState.isLiked,
    likesCount: likeState.likesCount,
    isLikeUpdating,
    toggleLike,
  };
};

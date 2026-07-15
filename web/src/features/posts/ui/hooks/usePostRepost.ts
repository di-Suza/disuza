import { useCallback, useMemo } from 'react';

import { useRepostPostMutation, useUnrepostPostMutation } from '@/features/posts/api/post.api';
import type { Post } from '@/features/posts/model/post.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

export const usePostRepost = (post: Post) => {
  const { showError } = useToast();
  const [repostPost, { isLoading: isReposting }] = useRepostPostMutation();
  const [unrepostPost, { isLoading: isUnreposting }] = useUnrepostPostMutation();

  const isReposted = Boolean(post.isReposted);
  const repostsCount = Number(post.counts?.reposts || 0);
  const isRepostUpdating = isReposting || isUnreposting;

  const toggleRepost = useCallback(async () => {
    try {
      if (isReposted) {
        await unrepostPost(post._id).unwrap();
      } else {
        await repostPost(post._id).unwrap();
      }
      return true;
    } catch (error) {
      showError(getErrorMessage(error, 'Repost update failed.'));
      return false;
    }
  }, [isReposted, post._id, repostPost, showError, unrepostPost]);

  return useMemo(() => ({
    isReposted,
    isRepostUpdating,
    repostsCount,
    toggleRepost,
  }), [isRepostUpdating, isReposted, repostsCount, toggleRepost]);
};

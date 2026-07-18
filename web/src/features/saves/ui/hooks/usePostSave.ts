import { useCallback, useEffect, useState } from 'react';

import { useSavePostMutation, useUnsavePostMutation } from '@/features/posts/api/post.api';
import type { Post } from '@/features/posts/model/post.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type PostSaveState = {
  isSaved: boolean;
};

const getPostSaveState = (post: Post): PostSaveState => ({
  isSaved: Boolean(post.isSaved),
});

export const usePostSave = (post: Post) => {
  const { showError } = useToast();
  const [savePost, { isLoading: isSaving }] = useSavePostMutation();
  const [unsavePost, { isLoading: isUnsaving }] = useUnsavePostMutation();
  const [saveState, setSaveState] = useState<PostSaveState>(() => getPostSaveState(post));

  useEffect(() => {
    setSaveState(getPostSaveState(post));
  }, [post._id, post.isSaved]);

  const isSaveUpdating = isSaving || isUnsaving;

  const markSaved = useCallback(() => {
    setSaveState({ isSaved: true });
  }, []);

  const toggleSave = useCallback(async () => {
    if (!post._id || isSaveUpdating) return false;

    const previousState = saveState;
    const nextSaved = !previousState.isSaved;
    setSaveState({ isSaved: nextSaved });

    try {
      if (nextSaved) {
        await savePost({ postId: post._id }).unwrap();
      } else {
        await unsavePost(post._id).unwrap();
      }
      return true;
    } catch (error) {
      setSaveState(previousState);
      showError(getErrorMessage(error));
      return false;
    }
  }, [isSaveUpdating, post._id, savePost, saveState, showError, unsavePost]);

  return {
    isSaved: saveState.isSaved,
    isSaveUpdating,
    markSaved,
    toggleSave,
  };
};
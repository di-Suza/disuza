import { useCallback, useEffect, useRef, useState } from 'react';

import { useSavePostMutation, useUnsavePostMutation } from '@/features/posts/api/post.api';
import type { Post } from '@/features/posts/model/post.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type PostSaveState = {
  postId: string;
  isSaved: boolean;
};

const getPostSaveState = (post: Post): PostSaveState => ({
  postId: post._id,
  isSaved: Boolean(post.isSaved),
});

export const usePostSave = (post: Post) => {
  const { showError } = useToast();
  const [savePost, { isLoading: isSaving }] = useSavePostMutation();
  const [unsavePost, { isLoading: isUnsaving }] = useUnsavePostMutation();
  const [saveState, setSaveState] = useState<PostSaveState>(() => getPostSaveState(post));
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    setSaveState(getPostSaveState(post));
  }, [post._id, post.isSaved]);

  const isSaveUpdating = isSaving || isUnsaving;

  const markSaved = useCallback(() => {
    setSaveState((currentState) => ({ postId: currentState.postId, isSaved: true }));
  }, []);

  const toggleSave = useCallback(async () => {
    if (!post._id || pendingSaveRef.current) return false;

    const previousState = saveState;
    const nextSaved = !previousState.isSaved;
    pendingSaveRef.current = true;
    setSaveState({ postId: post._id, isSaved: nextSaved });

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
    } finally {
      pendingSaveRef.current = false;
    }
  }, [post._id, savePost, saveState, showError, unsavePost]);

  return {
    isSaved: saveState.isSaved,
    isSaveUpdating,
    markSaved,
    toggleSave,
  };
};

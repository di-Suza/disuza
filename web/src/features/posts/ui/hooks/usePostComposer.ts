import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { useCreatePostMutation, useUpdatePostMutation } from '@/features/posts/api/post.api';
import { getPostMedia } from '@/features/posts/model/post.helpers';
import type { MediaKind, MediaOrderItem, Post } from '@/features/posts/model/post.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

export type PostComposerMode = 'create' | 'edit';

export type ComposerMediaItem = {
  id: string;
  mediaType: MediaKind;
  previewUrl: string;
  source: 'existing' | 'upload';
  file?: File;
  fileId?: string;
};

type UsePostComposerOptions = {
  mode: PostComposerMode;
  post?: Post | null;
  isOpen: boolean;
  onClose: () => void;
};

const MAX_MEDIA_ITEMS = 10;
const MAX_CAPTION_LENGTH = 2200;

const createItemId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getFileMediaType = (file: File): MediaKind | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

const getExistingMediaItems = (post?: Post | null): ComposerMediaItem[] => getPostMedia(post).map((media) => ({
  id: media.fileId || createItemId(),
  mediaType: media.mediaType,
  previewUrl: media.url,
  source: 'existing',
  fileId: media.fileId,
}));

export const usePostComposer = ({ isOpen, mode, onClose, post }: UsePostComposerOptions) => {
  const { showError, showSuccess } = useToast();
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const uploadPreviewUrls = useRef(new Set<string>());

  const [caption, setCaption] = useState('');
  const [mediaItems, setMediaItems] = useState<ComposerMediaItem[]>([]);
  const [isProjectPost, setIsProjectPost] = useState(false);
  const [settings, setSettings] = useState({ hideLikesCount: false, commentsDisabled: false });
  const [projectLinks, setProjectLinks] = useState({ liveDemoUrl: '', repositoryUrl: '' });

  const isSubmitting = isCreating || isUpdating;
  const isEditMode = mode === 'edit';
  const isEditingProjectPost = Boolean(isEditMode && post?.isProjectPost);
  const canEditProjectLinks = !isEditMode || isEditingProjectPost;
  const mediaFingerprint = getPostMedia(post).map((media) => `${media.fileId}:${media.order}`).join('|');

  const revokeUploadUrls = useCallback(() => {
    uploadPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    uploadPreviewUrls.current.clear();
  }, []);

  const resetFromPost = useCallback(() => {
    revokeUploadUrls();
    setCaption(post?.caption || '');
    setMediaItems(mode === 'edit' ? getExistingMediaItems(post) : []);
    setIsProjectPost(Boolean(post?.isProjectPost));
    setSettings({
      hideLikesCount: Boolean(post?.settings?.hideLikesCount),
      commentsDisabled: Boolean(post?.settings?.commentsDisabled),
    });
    setProjectLinks({
      liveDemoUrl: post?.projectLinks?.liveDemoUrl || '',
      repositoryUrl: post?.projectLinks?.repositoryUrl || '',
    });
  }, [mode, post, revokeUploadUrls]);

  useEffect(() => {
    if (!isOpen) return;
    resetFromPost();
  }, [isOpen, mediaFingerprint, resetFromPost]);

  useEffect(() => () => revokeUploadUrls(), [revokeUploadUrls]);

  const closeComposer = useCallback(() => {
    revokeUploadUrls();
    onClose();
  }, [onClose, revokeUploadUrls]);

  const handleFilesChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length) return;

    setMediaItems((currentItems) => {
      const availableSlots = MAX_MEDIA_ITEMS - currentItems.length;

      if (availableSlots <= 0) {
        showError(`A post can contain up to ${MAX_MEDIA_ITEMS} media items.`);
        return currentItems;
      }

      const nextItems: ComposerMediaItem[] = [];

      files.slice(0, availableSlots).forEach((file) => {
        const mediaType = getFileMediaType(file);

        if (!mediaType) {
          showError('Only image and video files are allowed.');
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        uploadPreviewUrls.current.add(previewUrl);
        nextItems.push({ id: createItemId(), mediaType, previewUrl, source: 'upload', file });
      });

      if (files.length > availableSlots) {
        showError(`Only ${availableSlots} more media item${availableSlots === 1 ? '' : 's'} can be added.`);
      }

      return [...currentItems, ...nextItems];
    });
  }, [showError]);

  const removeMedia = useCallback((itemId: string) => {
    setMediaItems((currentItems) => currentItems.filter((item) => {
      if (item.id !== itemId) return true;
      if (item.source === 'upload') {
        URL.revokeObjectURL(item.previewUrl);
        uploadPreviewUrls.current.delete(item.previewUrl);
      }
      return false;
    }));
  }, []);

  const moveMedia = useCallback((itemId: string, direction: -1 | 1) => {
    setMediaItems((currentItems) => {
      const currentIndex = currentItems.findIndex((item) => item.id === itemId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentItems.length) return currentItems;

      const nextItems = currentItems.slice();
      const [movedItem] = nextItems.splice(currentIndex, 1);
      nextItems.splice(nextIndex, 0, movedItem);
      return nextItems;
    });
  }, []);

  const updateSetting = useCallback((key: keyof typeof settings) => (event: ChangeEvent<HTMLInputElement>) => {
    setSettings((currentSettings) => ({ ...currentSettings, [key]: event.target.checked }));
  }, []);

  const updateProjectLink = useCallback((key: keyof typeof projectLinks) => (event: ChangeEvent<HTMLInputElement>) => {
    setProjectLinks((currentLinks) => ({ ...currentLinks, [key]: event.target.value }));
  }, []);

  const buildMediaOrder = useCallback((): MediaOrderItem[] => {
    const uploadItems = mediaItems.filter((item) => item.source === 'upload');
    const uploadIndexById = new Map(uploadItems.map((item, index) => [item.id, index]));

    return mediaItems.map((item) => {
      if (item.source === 'existing') {
        return { source: 'existing', fileId: item.fileId || '' };
      }

      return { source: 'upload', uploadIndex: uploadIndexById.get(item.id) || 0 };
    });
  }, [mediaItems]);

  const buildFormData = useCallback(() => {
    const formData = new FormData();
    const uploadItems = mediaItems.filter((item) => item.source === 'upload' && item.file);

    formData.append('caption', caption.trim());
    formData.append('settings', JSON.stringify(settings));
    formData.append('mediaOrder', JSON.stringify(buildMediaOrder()));

    uploadItems.forEach((item) => {
      if (item.file) formData.append('media', item.file);
    });

    if (mode === 'create') {
      formData.append('isProjectPost', String(isProjectPost));
    }

    if ((mode === 'create' && isProjectPost) || isEditingProjectPost) {
      formData.append('projectLinks', JSON.stringify({
        liveDemoUrl: projectLinks.liveDemoUrl.trim(),
        repositoryUrl: projectLinks.repositoryUrl.trim(),
      }));
    }

    return formData;
  }, [buildMediaOrder, caption, isEditingProjectPost, isProjectPost, mediaItems, mode, projectLinks, settings]);

  const validateForm = useCallback(() => {
    if (caption.length > MAX_CAPTION_LENGTH) {
      showError(`Caption cannot exceed ${MAX_CAPTION_LENGTH} characters.`);
      return false;
    }

    if (mediaItems.length === 0) {
      showError('Post cannot be saved without media.');
      return false;
    }

    if (mediaItems.length > MAX_MEDIA_ITEMS) {
      showError(`A post can contain up to ${MAX_MEDIA_ITEMS} media items.`);
      return false;
    }

    const needsProjectLinks = (mode === 'create' && isProjectPost) || isEditingProjectPost;

    if (needsProjectLinks && (!projectLinks.liveDemoUrl.trim() || !projectLinks.repositoryUrl.trim())) {
      showError('Project posts need both live demo and repository URLs.');
      return false;
    }

    return true;
  }, [caption.length, isEditingProjectPost, isProjectPost, mediaItems.length, mode, projectLinks, showError]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || !validateForm()) return;

    try {
      const formData = buildFormData();
      const result = isEditMode && post?._id
        ? await updatePost({ postId: post._id, body: formData }).unwrap()
        : await createPost(formData).unwrap();

      showSuccess(result.message);
      closeComposer();
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [buildFormData, closeComposer, createPost, isEditMode, isSubmitting, post?._id, showError, showSuccess, updatePost, validateForm]);

  const mediaSummary = useMemo(() => `${mediaItems.length}/${MAX_MEDIA_ITEMS}`, [mediaItems.length]);

  return {
    canEditProjectLinks,
    caption,
    closeComposer,
    handleFilesChange,
    handleSubmit,
    isEditMode,
    isEditingProjectPost,
    isProjectPost,
    isSubmitting,
    mediaItems,
    mediaSummary,
    moveMedia,
    projectLinks,
    removeMedia,
    setCaption,
    setIsProjectPost,
    settings,
    updateProjectLink,
    updateSetting,
  };
};
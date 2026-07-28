import type { Post, PostAuthor, PostMedia } from './post.types';

const hasMediaUrl = (media: PostMedia): boolean => typeof media.url === 'string' && media.url.trim().length > 0;

export const getPostMedia = (post?: Pick<Post, 'media' | 'images'> | null): PostMedia[] => {
  const media = Array.isArray(post?.media) && post.media.length > 0 ? post.media : post?.images;

  if (!Array.isArray(media)) return [];

  return media.filter(hasMediaUrl).slice().sort((first, second) => Number(first.order || 0) - Number(second.order || 0));
};

export const isVideoMedia = (media: PostMedia): boolean => media.mediaType === 'video' || Boolean(media.mime?.startsWith('video/'));

export const getPostAuthor = (post: Post, fallbackAuthor?: PostAuthor): PostAuthor | null => {
  if (post.user && typeof post.user === 'object') return post.user;
  return fallbackAuthor || null;
};

export const getPostOwnerId = (post: Post, fallbackAuthor?: PostAuthor): string | null => {
  if (typeof post.user === 'string') return post.user;
  if (post.user && typeof post.user === 'object') return post.user._id;
  return fallbackAuthor?._id || null;
};

export const getPostImageUrl = (author?: PostAuthor | null): string | null => {
  const url = author?.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : null;
};

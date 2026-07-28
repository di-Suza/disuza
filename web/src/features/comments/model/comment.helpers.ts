import type { CommentItem } from './comment.types';
import { getOptimizedImage } from '@/shared/utils/getOptimizedImage';

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export const formatCommentTime = (value?: string): string => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(seconds);
  const [unit, unitSeconds] = units.find(([, amount]) => absSeconds >= amount) || ['second', 1];

  return formatter.format(Math.round(seconds / unitSeconds), unit);
};

export const getCommentAvatarUrl = (comment?: Pick<CommentItem, 'user'> | null): string | null => {
  const url = comment?.user?.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? getOptimizedImage(url, 'avatarSmall') || url : null;
};

export const canDeleteComment = (comment: CommentItem, userId?: string | null): boolean => {
  if (!userId) return false;
  return comment.user?._id === userId || String(comment.postOwner) === userId;
};

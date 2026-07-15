import { Eye, Heart, MessageCircle, Play, Repeat2, UserRound } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { getPostAuthor, getPostImageUrl, getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Repost } from '@/features/posts/model/post.types';
import { cn } from '@/shared/utils/cn';

type RepostPreviewCardProps = {
  className?: string;
  repost: Repost;
};

const getPreviewText = (repost: Repost) => {
  const caption = repost.post.caption?.trim();
  if (caption) return caption;
  if (repost.post.codeSnippet?.code) return `Code snippet in ${repost.post.codeSnippet.language || 'text'}`;
  if (repost.post.isProjectPost) return 'Project post';
  return 'Reposted post';
};

const RepostPreviewCard = ({ className, repost }: RepostPreviewCardProps) => {
  const navigate = useNavigate();
  const post = repost.post;
  const media = getPostMedia(post);
  const firstMedia = media[0];
  const originalAuthor = getPostAuthor(post);
  const avatarUrl = getPostImageUrl(originalAuthor);

  return (
    <button
      type="button"
      onClick={() => navigate(`/post/${post._id}?repostId=${repost._id}`)}
      className={cn('dashboard-post-preview-card repost-preview-card', className)}
    >
      <span className={cn('dashboard-post-preview-card__media', !firstMedia && 'is-empty')}>
        {firstMedia && isVideoMedia(firstMedia) ? (
          <>
            <video src={firstMedia.url} preload="metadata" muted />
            <i><Play size={14} aria-hidden="true" /></i>
          </>
        ) : firstMedia ? (
          <img src={firstMedia.url} alt="Reposted post" loading="lazy" />
        ) : (
          <span className="repost-preview-card__empty"><Repeat2 size={22} aria-hidden="true" /></span>
        )}
        <em><Eye size={14} aria-hidden="true" /></em>
      </span>
      <span className="dashboard-post-preview-card__body">
        <span className="repost-preview-card__meta">
          <span className="repost-preview-card__avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={13} aria-hidden="true" />}
          </span>
          <span>
            <b>{repost.user?.userName || 'User'} reposted</b>
            <small>Original by {originalAuthor?.userName || 'DevLoopFeed'}</small>
          </span>
        </span>
        <strong>{getPreviewText(repost)}</strong>
        <small>
          <span><Heart size={12} aria-hidden="true" />{Number(post.counts?.likes || 0)}</span>
          <span><MessageCircle size={12} aria-hidden="true" />{Number(post.counts?.comments || 0)}</span>
        </small>
      </span>
    </button>
  );
};

export default memo(RepostPreviewCard);

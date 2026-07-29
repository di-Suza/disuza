import { ExternalLink, Repeat2, UserRound } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Repost } from '@/features/posts/model/post.types';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
import PostCard from './PostCard';
import '../posts.css';

type RepostDetailCardProps = {
  repost: Repost;
  viewerId?: string;
};

const formatTime = (value?: string) => {
  if (!value) return 'recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

const RepostDetailCard = ({ repost, viewerId }: RepostDetailCardProps) => {
  const navigate = useNavigate();
  const reposter = repost.user;
  const avatarUrl = reposter?.profilePicture?.url || '';

  return (
    <article className="repost-detail-card">
      <header className="repost-detail-card__header">
        <button type="button" className="repost-detail-card__user" onClick={() => navigate(`/profile/${reposter._id}`)}>
          <span>
            <AvatarImage src={avatarUrl} fallback={<UserRound size={20} aria-hidden="true" />} />
          </span>
          <span>
            <strong>{reposter.userName || 'User'}</strong>
            <small><Repeat2 size={13} aria-hidden="true" />reposted {formatTime(repost.createdAt)}</small>
          </span>
        </button>
        <button type="button" className="repost-detail-card__original" onClick={() => navigate(`/post/${repost.post._id}`)}>
          <ExternalLink size={15} aria-hidden="true" />
          See original post
        </button>
      </header>

      <PostCard post={repost.post} viewerId={viewerId} hideFeedbackAction className="repost-detail-card__post" />
    </article>
  );
};

export default memo(RepostDetailCard);

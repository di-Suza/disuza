import { Heart, MessageCircle, Play, Sparkles } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Post } from '@/features/posts/model/post.types';
import Image from '@/shared/components/Image/Image';

type SearchPostCardProps = {
  post: Post;
};

const SearchPostCard = ({ post }: SearchPostCardProps) => {
  const navigate = useNavigate();
  const media = (post.media || post.images || [])[0];
  const likes = post.counts?.likes || 0;
  const comments = post.counts?.comments || 0;
  const caption = post.caption || 'No caption available';

  return (
    <button
      type="button"
      onClick={() => navigate(`/post/${post._id}`)}
      className="search-post-card"
    >
      <div className="search-post-card__media">
        {media?.url ? (
          <>
            <Image
              src={media.thumbnailUrl || media.url}
              type="thumbnail"
              alt=""
              className="search-post-card__media-bg"
            />
            {media.mediaType === 'video' ? (
              <div className="search-post-card__video">
                <Play size={22} aria-hidden="true" />
              </div>
            ) : null}
            <Image
              src={media.thumbnailUrl || media.url}
              type="card"
              alt="Post preview"
              className="search-post-card__media-img"
            />
          </>
        ) : (
          <div className="search-post-card__empty">
            <Sparkles size={40} aria-hidden="true" />
          </div>
        )}
        <div className="search-post-card__shade" />
        <span className="search-post-card__badge">Trending</span>
      </div>

      <div className="search-post-card__body">
        <p>{caption}</p>
        <div className="search-post-card__meta">
          <span className="search-post-card__pill search-post-card__pill--like">
            <Heart size={13} aria-hidden="true" />
            {likes.toLocaleString()}
          </span>
          <span className="search-post-card__pill">
            <MessageCircle size={13} aria-hidden="true" />
            {comments.toLocaleString()}
          </span>
          <small>View</small>
        </div>
      </div>
    </button>
  );
};

export default memo(SearchPostCard);

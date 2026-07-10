import { Eye, Heart, Loader2, MessageCircle, Play, RefreshCw } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGetAllPostsQuery } from '@/features/posts/api/post.api';
import { getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post } from '@/features/posts/model/post.types';

type DashboardPostsPanelProps = {
  user?: unknown;
};

const PostPreviewCard = ({ post }: { post: Post }) => {
  const navigate = useNavigate();
  const media = getPostMedia(post);
  const firstMedia = media[0];
  const caption = post.caption || 'Untitled post';

  return (
    <button type="button" onClick={() => navigate(`/post/${post._id}`)} className="dashboard-post-preview-card">
      <span className="dashboard-post-preview-card__media">
        {firstMedia && isVideoMedia(firstMedia) ? (
          <>
            <video src={firstMedia.url} preload="metadata" muted />
            <i><Play size={14} aria-hidden="true" /></i>
          </>
        ) : firstMedia ? (
          <img src={firstMedia.url} alt="Post" loading="lazy" />
        ) : null}
        <em><Eye size={14} aria-hidden="true" /></em>
      </span>
      <span className="dashboard-post-preview-card__body">
        <strong>{caption}</strong>
        <small>
          <span><Heart size={12} aria-hidden="true" />{Number(post.counts?.likes || 0)}</span>
          <span><MessageCircle size={12} aria-hidden="true" />{Number(post.counts?.comments || 0)}</span>
        </small>
      </span>
    </button>
  );
};

const DashboardPostsPanel = (_props: DashboardPostsPanelProps) => {
  const { data, isError, isFetching, isLoading, refetch } = useGetAllPostsQuery({ page: 1, limit: 20 });
  const posts = data?.posts || [];

  if (isError) {
    return (
      <div className="dashboard-posts-v1">
        <div className="post-empty-state">
          <RefreshCw size={24} aria-hidden="true" />
          <p>Posts could not be loaded.</p>
          <button type="button" onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-posts-v1">
      <div className="dashboard-posts-v1__header">
        <div>
          <p>Gallery</p>
          <h2>Your Posts</h2>
        </div>
        <span>{posts.length} posts</span>
      </div>

      <div className="dashboard-posts-v1__grid">
        {isLoading ? (
          <div className="dashboard-posts-v1__state"><Loader2 className="spin" size={18} aria-hidden="true" />Loading all posts...</div>
        ) : posts.length > 0 ? (
          posts.map((post) => <PostPreviewCard post={post} key={post._id} />)
        ) : (
          <div className="dashboard-posts-v1__state is-empty">You have no posts yet.</div>
        )}
      </div>

      {isFetching && !isLoading && <div className="dashboard-posts-v1__loading"><Loader2 className="spin" size={18} aria-hidden="true" />Loading more posts...</div>}
    </div>
  );
};

export default memo(DashboardPostsPanel);
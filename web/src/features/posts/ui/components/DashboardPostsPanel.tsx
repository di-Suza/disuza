import { Eye, Heart, Loader2, MessageCircle, Play, RefreshCw } from 'lucide-react';
import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useGetAllPostsQuery, useGetUserRepostsQuery } from '@/features/posts/api/post.api';
import { getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post } from '@/features/posts/model/post.types';
import RepostPreviewCard from './RepostPreviewCard';
import '../posts.css';

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

type DashboardPostView = 'yours' | 'reposts';

const DashboardPostsPanel = (_props: DashboardPostsPanelProps) => {
  const [activeView, setActiveView] = useState<DashboardPostView>('yours');
  const viewerId = useAppSelector((state) => state.auth.user?._id);
  const { data, isError, isFetching, isLoading, refetch } = useGetAllPostsQuery({ page: 1, limit: 20 });
  const repostsQuery = useGetUserRepostsQuery(
    { userId: viewerId || '', page: 1, limit: 20 },
    { skip: !viewerId },
  );
  const posts = data?.posts || [];
  const reposts = repostsQuery.data?.reposts || [];
  const isActiveLoading = activeView === 'yours' ? isLoading : repostsQuery.isLoading;
  const isActiveFetching = activeView === 'yours' ? isFetching : repostsQuery.isFetching;
  const activeCount = activeView === 'yours' ? posts.length : reposts.length;

  if ((activeView === 'yours' && isError) || (activeView === 'reposts' && repostsQuery.isError)) {
    return (
      <div className="dashboard-posts-v1">
        <div className="post-empty-state">
          <RefreshCw size={24} aria-hidden="true" />
          <p>Posts could not be loaded.</p>
          <button type="button" onClick={() => (activeView === 'yours' ? refetch() : repostsQuery.refetch())}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-posts-v1">
      <div className="dashboard-posts-v1__header">
        <h2>{activeView === 'yours' ? 'Your Posts' : 'Your Reposts'}</h2>
        <div className="dashboard-posts-v1__switcher" aria-label="Dashboard post view">
          <button type="button" className={activeView === 'yours' ? 'is-active' : ''} onClick={() => setActiveView('yours')}>Yours</button>
          <button type="button" className={activeView === 'reposts' ? 'is-active' : ''} onClick={() => setActiveView('reposts')}>Reposts</button>
        </div>
        <span>{activeCount} {activeView === 'yours' ? 'posts' : 'reposts'}</span>
      </div>

      <div className="dashboard-posts-v1__grid">
        {isActiveLoading ? (
          <div className="dashboard-posts-v1__state"><Loader2 className="spin" size={18} aria-hidden="true" />Loading {activeView === 'yours' ? 'posts' : 'reposts'}...</div>
        ) : activeView === 'yours' && posts.length > 0 ? (
          posts.map((post) => <PostPreviewCard post={post} key={post._id} />)
        ) : activeView === 'reposts' && reposts.length > 0 ? (
          reposts.map((repost) => <RepostPreviewCard repost={repost} key={repost._id} />)
        ) : (
          <div className="dashboard-posts-v1__state is-empty">{activeView === 'yours' ? 'You have no posts yet.' : 'You have no reposts yet.'}</div>
        )}
      </div>

      {isActiveFetching && !isActiveLoading && <div className="dashboard-posts-v1__loading"><Loader2 className="spin" size={18} aria-hidden="true" />Loading more {activeView === 'yours' ? 'posts' : 'reposts'}...</div>}
    </div>
  );
};

export default memo(DashboardPostsPanel);

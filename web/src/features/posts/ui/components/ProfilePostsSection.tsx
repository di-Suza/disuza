import { Briefcase, Eye, Grid2X2, Heart, MessageCircle, Play, Repeat2, type LucideIcon } from 'lucide-react';
import { memo, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGetUserRepostsQuery } from '@/features/posts/api/post.api';
import { getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post } from '@/features/posts/model/post.types';
import type { UserProfile } from '@/features/users/model/user.types';
import Image from '@/shared/components/Image/Image';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import RepostPreviewCard from './RepostPreviewCard';
import '../posts.css';

type ProfilePostsSectionProps = {
  normalPosts: Post[];
  profileUser: UserProfile;
  projectPosts: Post[];
  viewerId?: string;
};

const ProfilePostPreviewCard = memo(({ post }: { post: Post }) => {
  const navigate = useNavigate();
  const media = useMemo(() => getPostMedia(post), [post]);
  const firstMedia = media[0];
  const caption = post.caption || 'Untitled post';
  const openPost = useCallback(() => navigate(`/post/${post._id}`), [navigate, post._id]);

  return (
    <button type="button" onClick={openPost} className="dashboard-post-preview-card profile-post-preview-card">
      <span className="dashboard-post-preview-card__media">
        {firstMedia && isVideoMedia(firstMedia) ? (
          <>
            <video src={firstMedia.url} preload="metadata" muted />
            <i><Play size={14} aria-hidden="true" /></i>
          </>
        ) : firstMedia ? (
          <Image src={firstMedia.thumbnailUrl || firstMedia.url} type="thumbnail" alt="Post" />
        ) : (
          <span className="repost-preview-card__empty"><Grid2X2 size={22} aria-hidden="true" /></span>
        )}
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
});

ProfilePostPreviewCard.displayName = 'ProfilePostPreviewCard';

const ProfilePostSection = ({ children, icon: Icon, title }: { children: ReactNode; icon: LucideIcon; title: string }) => (
  <section className="profile-posts-section">
    <div className="profile-posts-section__header">
      <span><Icon size={20} aria-hidden="true" /></span>
      <div><h2>{title}</h2></div>
    </div>
    <div className="profile-posts-section__gallery">{children}</div>
  </section>
);

const ProfilePostsSection = ({ normalPosts, profileUser, projectPosts }: ProfilePostsSectionProps) => {
  const { data: repostData, isFetching: isRepostsFetching, isLoading: isRepostsLoading } = useGetUserRepostsQuery({
    userId: profileUser._id,
    page: 1,
    limit: 20,
  });
  const reposts = repostData?.reposts || [];
  const hasNormalPosts = normalPosts.length > 0;
  const hasProjectPosts = projectPosts.length > 0;
  const hasReposts = reposts.length > 0;

  if (!hasNormalPosts && !hasProjectPosts && !hasReposts && !isRepostsLoading) return null;

  return (
    <>
      {hasProjectPosts && (
        <ProfilePostSection icon={Briefcase} title="Project Posts">
          {projectPosts.map((post) => <ProfilePostPreviewCard post={post} key={post._id} />)}
        </ProfilePostSection>
      )}

      {hasNormalPosts && (
        <ProfilePostSection icon={Grid2X2} title="All Posts">
          {normalPosts.map((post) => <ProfilePostPreviewCard post={post} key={post._id} />)}
        </ProfilePostSection>
      )}

      {(hasReposts || isRepostsLoading) && (
        <ProfilePostSection icon={Repeat2} title="Reposts">
          {isRepostsLoading ? (
            <LoadingSpinner className="profile-posts-section__state" label="Loading reposts" />
          ) : (
            <>
              {reposts.map((repost) => <RepostPreviewCard repost={repost} key={repost._id} />)}
              {isRepostsFetching && <LoadingSpinner className="profile-posts-section__state is-inline" label="Refreshing reposts" size={18} />}
            </>
          )}
        </ProfilePostSection>
      )}
    </>
  );
};

export default memo(ProfilePostsSection);

import { Loader2 } from 'lucide-react';
import { memo, useMemo } from 'react';

import { useGetUserRepostsQuery } from '@/features/posts/api/post.api';
import type { Post, PostAuthor } from '@/features/posts/model/post.types';
import type { UserProfile } from '@/features/users/model/user.types';
import PostList from './PostList';
import RepostPreviewCard from './RepostPreviewCard';
import '../posts.css';

type ProfilePostsSectionProps = {
  normalPosts: Post[];
  profileUser: UserProfile;
  projectPosts: Post[];
  viewerId?: string;
};

const ProfilePostsSection = ({ normalPosts, profileUser, projectPosts, viewerId }: ProfilePostsSectionProps) => {
  const { data: repostData, isFetching: isRepostsFetching, isLoading: isRepostsLoading } = useGetUserRepostsQuery({
    userId: profileUser._id,
    page: 1,
    limit: 20,
  });
  const reposts = repostData?.reposts || [];
  const hasNormalPosts = normalPosts.length > 0;
  const hasProjectPosts = projectPosts.length > 0;
  const hasReposts = reposts.length > 0;
  const fallbackAuthor = useMemo<PostAuthor>(() => ({
    _id: profileUser._id,
    userName: profileUser.userName,
    profilePicture: profileUser.profilePicture,
    headline: profileUser.headline,
  }), [profileUser._id, profileUser.headline, profileUser.profilePicture, profileUser.userName]);

  if (!hasNormalPosts && !hasProjectPosts && !hasReposts && !isRepostsLoading) return null;

  return (
    <section className="profile-posts-section">
      <div className="profile-posts-section__header">
        <div>
          <p className="state-panel__eyebrow">Posts</p>
          <h2>Activity</h2>
        </div>
      </div>

      <div className="profile-posts-section__columns">
        {hasProjectPosts && (
          <div className="profile-posts-section__column">
            <h3>Projects</h3>
            <PostList posts={projectPosts} viewerId={viewerId} fallbackAuthor={fallbackAuthor} compact emptyText="No project posts yet." />
          </div>
        )}
        {hasNormalPosts && (
          <div className="profile-posts-section__column">
            <h3>Posts</h3>
            <PostList posts={normalPosts} viewerId={viewerId} fallbackAuthor={fallbackAuthor} compact emptyText="No posts yet." />
          </div>
        )}
        {(hasReposts || isRepostsLoading) && (
          <div className="profile-posts-section__column">
            <h3>Reposts</h3>
            {isRepostsLoading ? (
              <div className="post-empty-state"><Loader2 className="spin" size={20} aria-hidden="true" /><p>Loading reposts...</p></div>
            ) : (
              <div className="repost-preview-list">
                {reposts.map((repost) => <RepostPreviewCard repost={repost} key={repost._id} />)}
                {isRepostsFetching && <div className="dashboard-posts-v1__loading"><Loader2 className="spin" size={18} aria-hidden="true" />Refreshing reposts...</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(ProfilePostsSection);

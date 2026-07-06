import { memo, useMemo } from 'react';

import type { Post, PostAuthor } from '@/features/posts/model/post.types';
import type { UserProfile } from '@/features/users/model/user.types';
import PostList from './PostList';

type ProfilePostsSectionProps = {
  normalPosts: Post[];
  profileUser: UserProfile;
  projectPosts: Post[];
  viewerId?: string;
};

const ProfilePostsSection = ({ normalPosts, profileUser, projectPosts, viewerId }: ProfilePostsSectionProps) => {
  const fallbackAuthor = useMemo<PostAuthor>(() => ({
    _id: profileUser._id,
    userName: profileUser.userName,
    profilePicture: profileUser.profilePicture,
    headline: profileUser.headline,
  }), [profileUser._id, profileUser.headline, profileUser.profilePicture, profileUser.userName]);

  return (
    <section className="profile-posts-section">
      <div className="profile-posts-section__header">
        <div>
          <p className="state-panel__eyebrow">Posts</p>
          <h2>Activity</h2>
        </div>
      </div>

      <div className="profile-posts-section__columns">
        <div className="profile-posts-section__column">
          <h3>Posts</h3>
          <PostList posts={normalPosts} viewerId={viewerId} fallbackAuthor={fallbackAuthor} compact emptyText="No posts yet." />
        </div>
        <div className="profile-posts-section__column">
          <h3>Projects</h3>
          <PostList posts={projectPosts} viewerId={viewerId} fallbackAuthor={fallbackAuthor} compact emptyText="No project posts yet." />
        </div>
      </div>
    </section>
  );
};

export default memo(ProfilePostsSection);
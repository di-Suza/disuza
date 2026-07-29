import { Newspaper } from 'lucide-react';
import { memo } from 'react';

import type { Post, PostAuthor } from '@/features/posts/model/post.types';
import { cn } from '@/shared/utils/cn';
import PostCard from './PostCard';
import PostUploadStatusCard from './PostUploadStatusCard';
import '../posts.css';

type PostListProps = {
  posts: Post[];
  viewerId?: string;
  fallbackAuthor?: PostAuthor;
  emptyText?: string;
  className?: string;
  compact?: boolean;
};

const PostList = ({ className, compact = false, emptyText = 'No posts yet.', fallbackAuthor, posts, viewerId }: PostListProps) => {
  if (posts.length === 0) {
    return (
      <div className={cn('post-empty-state', className)}>
        <Newspaper size={24} aria-hidden="true" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={cn('post-list', compact && 'post-list--compact', className)}>
      {posts.map((post) => (
        post.uploadState?.status && post.uploadState.status !== 'ready'
          ? <PostUploadStatusCard key={post._id} post={post} />
          : <PostCard key={post._id} post={post} viewerId={viewerId} fallbackAuthor={fallbackAuthor} compact={compact} />
      ))}
    </div>
  );
};

export default memo(PostList);

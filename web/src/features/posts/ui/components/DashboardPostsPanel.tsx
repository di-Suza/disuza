import { ImagePlus, Loader2, RefreshCw } from 'lucide-react';
import { memo, useMemo, useState } from 'react';

import type { AuthUser } from '@/features/auth/model/auth.types';
import { useGetAllPostsQuery } from '@/features/posts/api/post.api';
import type { PostAuthor } from '@/features/posts/model/post.types';
import Button from '@/shared/ui/Button';
import PostComposerModal from './PostComposerModal';
import PostList from './PostList';

type DashboardPostsPanelProps = {
  user: AuthUser | null;
};

const DashboardPostsPanel = ({ user }: DashboardPostsPanelProps) => {
  const [isComposerOpen, setComposerOpen] = useState(false);
  const { data, isFetching, refetch } = useGetAllPostsQuery({ page: 1, limit: 6 });

  const fallbackAuthor = useMemo<PostAuthor | undefined>(() => {
    if (!user) return undefined;

    return {
      _id: user._id,
      userName: user.userName,
      profilePicture: user.profilePicture,
      headline: user.headline,
    };
  }, [user]);

  return (
    <section className="dashboard-posts-panel">
      <div className="dashboard-posts-panel__header">
        <div>
          <p className="state-panel__eyebrow">Posts</p>
          <h2>Your posts</h2>
        </div>
        <div className="dashboard-posts-panel__actions">
          <Button variant="ghost" className="button--icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh posts">
            {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
          </Button>
          <Button onClick={() => setComposerOpen(true)}>
            <ImagePlus size={18} aria-hidden="true" />New post
          </Button>
        </div>
      </div>

      <PostList
        posts={data?.posts || []}
        viewerId={user?._id}
        fallbackAuthor={fallbackAuthor}
        compact
        emptyText="No posts created yet."
      />

      <PostComposerModal isOpen={isComposerOpen} mode="create" onClose={() => setComposerOpen(false)} />
    </section>
  );
};

export default memo(DashboardPostsPanel);
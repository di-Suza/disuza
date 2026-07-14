import { Loader2, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useGetPostQuery } from '@/features/posts/api/post.api';
import PostCard from '@/features/posts/ui/components/PostCard';
import BackButton from '@/shared/components/BackButton/BackButton';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const PostDetailPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const viewerId = useAppSelector((state) => state.auth.user?._id);
  const { data, error, isError, isFetching, isLoading, refetch } = useGetPostQuery(postId || '', { skip: !postId });
  const post = data?.post;

  if (isLoading) {
    return (
      <main className="dashboard-shell dashboard-shell--wide">
        <section className="state-panel"><Loader2 className="spin" aria-hidden="true" /><h1>Loading post</h1></section>
      </main>
    );
  }

  if (isError || !post) {
    return (
      <main className="dashboard-shell dashboard-shell--wide">
        <section className="state-panel">
          <BackButton />
          <p className="state-panel__eyebrow">Post</p>
          <h1>Post could not be loaded.</h1>
          <p>{getErrorMessage(error, "Post doesn't exist or is unavailable.")}</p>
          <div className="dashboard-actions dashboard-actions--top">
            <Button onClick={() => refetch()}><RefreshCw size={18} aria-hidden="true" />Retry</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell dashboard-shell--wide post-detail-shell">
      <section className="dashboard-panel dashboard-panel--wide post-detail-panel">
        <header className="post-detail-header">
          <BackButton />
          {isFetching ? <span>Refreshing post...</span> : null}
        </header>
        <PostCard post={post} viewerId={viewerId} />
      </section>
    </main>
  );
};

export default PostDetailPage;

import { RefreshCw } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useGetPostQuery, useGetRepostQuery } from '@/features/posts/api/post.api';
import PostCard from '@/features/posts/ui/components/PostCard';
import RepostDetailCard from '@/features/posts/ui/components/RepostDetailCard';
import BackButton from '@/shared/components/BackButton/BackButton';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import '../../posts.css';
import './PostDetailPage.css';
import '@/app/layouts/ProductShell.css';

const PostDetailPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const repostId = searchParams.get('repostId') || '';
  const isRepostDetail = Boolean(repostId);
  const viewerId = useAppSelector((state) => state.auth.user?._id);
  const postQuery = useGetPostQuery(postId || '', { skip: !postId || isRepostDetail });
  const repostQuery = useGetRepostQuery(repostId, { skip: !isRepostDetail });
  const post = postQuery.data?.post;
  const repost = repostQuery.data?.repost;
  const error = isRepostDetail ? repostQuery.error : postQuery.error;
  const isError = isRepostDetail ? repostQuery.isError : postQuery.isError;
  const isFetching = isRepostDetail ? repostQuery.isFetching : postQuery.isFetching;
  const isLoading = isRepostDetail ? repostQuery.isLoading : postQuery.isLoading;
  const refetch = isRepostDetail ? repostQuery.refetch : postQuery.refetch;

  if (isLoading) {
    return (
      <main className="dashboard-shell dashboard-shell--wide">
        <LoadingSpinner className="state-panel" label={isRepostDetail ? 'Loading repost' : 'Loading post'} />
      </main>
    );
  }

  if (isError || (isRepostDetail ? !repost : !post)) {
    return (
      <main className="dashboard-shell dashboard-shell--wide">
        <section className="state-panel">
          <BackButton />
          <p className="state-panel__eyebrow">Post</p>
          <h1>{isRepostDetail ? 'Repost could not be loaded.' : 'Post could not be loaded.'}</h1>
          <p>{getErrorMessage(error, isRepostDetail ? "Repost doesn't exist or is unavailable." : "Post doesn't exist or is unavailable.")}</p>
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
          {isFetching ? <span>Refreshing {isRepostDetail ? 'repost' : 'post'}...</span> : null}
        </header>
        <ErrorBoundary variant="section" title="Post content could not be rendered." resetKeys={[postId, repostId]} showReload={false}>
          {isRepostDetail && repost ? (
            <RepostDetailCard repost={repost} viewerId={viewerId} />
          ) : post ? (
            <PostCard post={post} viewerId={viewerId} />
          ) : null}
        </ErrorBoundary>
      </section>
    </main>
  );
};

export default PostDetailPage;

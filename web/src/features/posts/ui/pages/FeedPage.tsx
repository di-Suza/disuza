import { ImagePlus, Loader2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { PostAuthor } from '@/features/posts/model/post.types';
import Button from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import PostComposerModal from '../components/PostComposerModal';
import PostList from '../components/PostList';
import { useFeedPage } from './useFeedPage';

const FeedPage = () => {
  const [isComposerOpen, setComposerOpen] = useState(false);
  const { feedType, isError, isFetching, isLoading, posts, refetch, setFeedType, user } = useFeedPage();

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
    <main className="dashboard-shell dashboard-shell--wide feed-shell">
      <section className="dashboard-panel dashboard-panel--wide feed-panel">
        <header className="feed-header">
          <div>
            <p className="state-panel__eyebrow">Home</p>
            <h1>Developer feed</h1>
          </div>

          <div className="feed-header__actions">
            <div className="segmented-control" aria-label="Feed type">
              <button type="button" className={cn(feedType === 'all' && 'is-active')} onClick={() => setFeedType('all')} aria-pressed={feedType === 'all'}>
                All
              </button>
              <button type="button" className={cn(feedType === 'following' && 'is-active')} onClick={() => setFeedType('following')} aria-pressed={feedType === 'following'}>
                Following
              </button>
            </div>
            <Button variant="ghost" className="button--icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh feed">
              {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
            </Button>
            <Button onClick={() => setComposerOpen(true)}>
              <ImagePlus size={18} aria-hidden="true" />New post
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="post-empty-state">
            <Loader2 className="spin" aria-hidden="true" />
            <p>Loading feed...</p>
          </div>
        ) : isError ? (
          <div className="post-empty-state">
            <RefreshCw size={24} aria-hidden="true" />
            <p>Feed could not be loaded.</p>
          </div>
        ) : (
          <PostList
            posts={posts}
            viewerId={user?._id}
            fallbackAuthor={fallbackAuthor}
            emptyText={feedType === 'following' ? 'No posts from followed developers yet.' : 'No posts in the feed yet.'}
          />
        )}

        <PostComposerModal isOpen={isComposerOpen} mode="create" onClose={() => setComposerOpen(false)} />
      </section>
    </main>
  );
};

export default FeedPage;
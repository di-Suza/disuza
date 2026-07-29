import { Eye, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useGetUserRecommendationsQuery } from '@/features/users/api/user.api';
import type { UserProfile } from '@/features/users/model/user.types';
import type { FeedType, Post, PostAuthor } from '@/features/posts/model/post.types';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import InlinePostComposer from '../components/InlinePostComposer';
import PostCard from '../components/PostCard';
import PostUploadStatusCard from '../components/PostUploadStatusCard';
import { useFeedPage } from './useFeedPage';
import '../posts.css';
import '@/app/layouts/ProductShell.css';

const EMPTY_RECOMMENDATIONS: UserProfile[] = [];

const PostCardSkeleton = () => (
  <div className="feed-post-skeleton">
    <div className="feed-post-skeleton__header"><span /><div><i /><i /></div><em /></div>
    <div className="feed-post-skeleton__media" />
    <div className="feed-post-skeleton__actions">{[0, 1, 2, 3].map((item) => <span key={item} />)}</div>
    <div className="feed-post-skeleton__copy"><span /><span /></div>
  </div>
);

const RecommendationCard = memo(({ user }: { user: UserProfile }) => {
  const navigate = useNavigate();
  const avatarUrl = typeof user.profilePicture?.url === 'string' ? user.profilePicture.url : '';

  return (
    <button type="button" onClick={() => navigate(`/profile/${user._id}`)} className="recommendation-slider-card">
      <span className="recommendation-slider-card__avatar"><AvatarImage src={avatarUrl} fallback={<UserRound size={22} aria-hidden="true" />} /></span>
      <span className="recommendation-slider-card__copy"><strong>{user.userName}</strong>{user.headline && <small>{user.headline}</small>}</span>
      <em><Eye size={14} aria-hidden="true" />View</em>
    </button>
  );
});

RecommendationCard.displayName = 'RecommendationCard';

const UserRecommendations = memo(({ recommendations, variant = 'rail' }: { recommendations: UserProfile[]; variant?: 'rail' | 'slider' }) => {
  if (recommendations.length === 0) return null;

  if (variant === 'slider') {
    return (
      <section className="recommendation-slider">
        <div className="recommendation-header"><Sparkles size={16} aria-hidden="true" /><h2>You may know</h2></div>
        <div className="recommendation-slider__track">{recommendations.map((item) => <RecommendationCard key={item._id} user={item} />)}</div>
      </section>
    );
  }

  return (
    <aside className="recommendation-rail">
      <div className="recommendation-header"><span><Sparkles size={16} aria-hidden="true" /></span><div><h2>You may know</h2><p>From your network</p></div></div>
      <div className="recommendation-rail__list">
        {recommendations.slice(0, 6).map((item) => {
          const avatarUrl = typeof item.profilePicture?.url === 'string' ? item.profilePicture.url : '';
          return (
            <Link key={item._id} to={`/profile/${item._id}`} className="recommendation-row">
              <span><AvatarImage src={avatarUrl} fallback={<UserRound size={18} aria-hidden="true" />} /></span>
              <span><strong>{item.userName}</strong><small>{item.headline || 'Disuza member'}</small></span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
});

UserRecommendations.displayName = 'UserRecommendations';

const FeedPostItem = memo(({ fallbackAuthor, post, viewerId }: { fallbackAuthor?: PostAuthor; post: Post; viewerId?: string }) => (
  <div className="home-feed-exact__post-shell">
    <PostCard post={post} viewerId={viewerId} fallbackAuthor={fallbackAuthor} />
  </div>
));

FeedPostItem.displayName = 'FeedPostItem';

const FEED_RENDER_BATCH_SIZE = 8;

const preservedHomeFeedView: { feedType: FeedType; scrollY: number; visiblePostCount: number } = {
  feedType: 'all',
  scrollY: 0,
  visiblePostCount: FEED_RENDER_BATCH_SIZE,
};

type FeedVirtualItem =
  | { id: string; type: 'post'; post: Post }
  | { id: string; type: 'recommendations' };

const FeedPage = () => {
  const [recommendationInsertIndex] = useState(() => Math.floor(Math.random() * 3) + 2);
  const { feedType, hasMore, isError, isFetching, isLoading, loadMore, posts, refetch, user } = useFeedPage();
  const [visiblePostCount, setVisiblePostCount] = useState(() => (
    preservedHomeFeedView.feedType === feedType ? preservedHomeFeedView.visiblePostCount : FEED_RENDER_BATCH_SIZE
  ));
  const hasRestoredScrollRef = useRef(false);
  const previousFeedTypeRef = useRef(feedType);
  const pendingUploads = useAppSelector((state) => state.postUploads.tasks);
  const { data: recommendationsData } = useGetUserRecommendationsQuery({ limit: 12 });
  const recommendations = recommendationsData?.recommendations || EMPTY_RECOMMENDATIONS;
  const hasRecommendations = recommendations.length > 0;
  const pendingPostIds = useMemo(() => new Set(pendingUploads.map((task) => task.postId).filter(Boolean)), [pendingUploads]);
  const readyPosts = useMemo(() => posts.filter((post) => (
    (post.uploadState?.status === undefined || post.uploadState.status === 'ready')
    && !pendingPostIds.has(post._id)
  )), [pendingPostIds, posts]);
  const inlineRecommendationIndex = readyPosts.length >= 2 ? Math.min(recommendationInsertIndex, readyPosts.length) : null;
  const visiblePosts = useMemo(() => readyPosts.slice(0, visiblePostCount), [readyPosts, visiblePostCount]);
  const feedItems = useMemo<FeedVirtualItem[]>(() => {
    const items: FeedVirtualItem[] = [];

    visiblePosts.forEach((post, index) => {
      items.push({ id: post._id, type: 'post', post });
      if (hasRecommendations && inlineRecommendationIndex === index + 1) {
        items.push({ id: 'inline-recommendations', type: 'recommendations' });
      }
    });

    return items;
  }, [hasRecommendations, inlineRecommendationIndex, visiblePosts]);
  const hasHiddenLoadedPosts = visiblePostCount < readyPosts.length;
  const rowVirtualizer = useWindowVirtualizer({
    count: feedItems.length,
    estimateSize: (index) => (feedItems[index]?.type === 'recommendations' ? 230 : 760),
    getItemKey: (index) => feedItems[index]?.id || index,
    overscan: 4,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const virtualListHeight = rowVirtualizer.getTotalSize();
  const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index ?? -1;

  const fallbackAuthor = useMemo<PostAuthor | undefined>(() => {
    if (!user) return undefined;
    return { _id: user._id, userName: user.userName, profilePicture: user.profilePicture, headline: user.headline };
  }, [user]);

  useEffect(() => {
    if (previousFeedTypeRef.current === feedType) return;

    previousFeedTypeRef.current = feedType;
    preservedHomeFeedView.feedType = feedType;
    preservedHomeFeedView.scrollY = 0;
    preservedHomeFeedView.visiblePostCount = FEED_RENDER_BATCH_SIZE;
    hasRestoredScrollRef.current = true;
    setVisiblePostCount(FEED_RENDER_BATCH_SIZE);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [feedType]);

  useEffect(() => {
    preservedHomeFeedView.feedType = feedType;
    preservedHomeFeedView.visiblePostCount = visiblePostCount;
  }, [feedType, visiblePostCount]);

  useEffect(() => {
    const rememberScrollPosition = () => {
      preservedHomeFeedView.feedType = feedType;
      preservedHomeFeedView.scrollY = window.scrollY;
      preservedHomeFeedView.visiblePostCount = visiblePostCount;
    };

    window.addEventListener('scroll', rememberScrollPosition, { passive: true });
    window.addEventListener('beforeunload', rememberScrollPosition);

    return () => {
      rememberScrollPosition();
      window.removeEventListener('scroll', rememberScrollPosition);
      window.removeEventListener('beforeunload', rememberScrollPosition);
    };
  }, [feedType, visiblePostCount]);

  useLayoutEffect(() => {
    if (hasRestoredScrollRef.current || isLoading || preservedHomeFeedView.feedType !== feedType) return;

    const scrollY = preservedHomeFeedView.scrollY;
    if (scrollY <= 0) {
      hasRestoredScrollRef.current = true;
      return;
    }

    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScrollY <= 0) return;

    hasRestoredScrollRef.current = true;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.min(scrollY, maxScrollY), left: 0, behavior: 'auto' });
    });
  }, [feedType, isLoading, readyPosts.length, virtualListHeight]);

  useEffect(() => {
    if (lastVirtualIndex < Math.max(0, feedItems.length - 3)) return;

    if (hasHiddenLoadedPosts) {
      setVisiblePostCount((current) => Math.min(readyPosts.length, current + FEED_RENDER_BATCH_SIZE));
      return;
    }

    if (hasMore && !isFetching) loadMore();
  }, [feedItems.length, hasHiddenLoadedPosts, hasMore, isFetching, lastVirtualIndex, loadMore, readyPosts.length]);

  return (
    <div className={hasRecommendations ? 'home-feed-exact has-recommendations' : 'home-feed-exact'}>
      <main className="home-feed-exact__main">
        <ErrorBoundary variant="section" title="Post composer could not be rendered." showReload={false}>
          <InlinePostComposer />
        </ErrorBoundary>
        {pendingUploads.length > 0 && (
          <div className="home-feed-exact__uploads">
            {pendingUploads.map((task) => <PostUploadStatusCard key={task.clientUploadId} task={task} />)}
          </div>
        )}
        {isLoading ? (
          <><PostCardSkeleton /><PostCardSkeleton /></>
        ) : isError ? (
          <div className="post-empty-state"><RefreshCw size={24} aria-hidden="true" /><p>Feed could not be loaded.</p><button type="button" onClick={() => refetch()}>Retry</button></div>
        ) : readyPosts.length === 0 && pendingUploads.length === 0 ? (
          <p className="home-feed-exact__empty">{feedType === 'following' ? 'No posts from people you follow yet' : 'No posts yet'}</p>
        ) : (
          <>
            <div className="home-feed-exact__virtual-list" style={{ height: `${virtualListHeight}px` }}>
              {virtualItems.map((virtualItem) => {
                const item = feedItems[virtualItem.index];
                if (!item) return null;

                return (
                  <div
                    key={virtualItem.key}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    className="home-feed-exact__virtual-row"
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                  >
                    {item.type === 'post' ? (
                      <ErrorBoundary variant="section" title="This post could not be rendered." resetKeys={[item.post._id]} showReload={false}>
                        <FeedPostItem post={item.post} viewerId={user?._id} fallbackAuthor={fallbackAuthor} />
                      </ErrorBoundary>
                    ) : (
                      <ErrorBoundary variant="section" title="Recommendations could not be rendered." showReload={false}>
                        <UserRecommendations recommendations={recommendations} variant="slider" />
                      </ErrorBoundary>
                    )}
                  </div>
                );
              })}
            </div>
            {hasRecommendations && !feedItems.some((item) => item.type === 'recommendations') && inlineRecommendationIndex !== null && visiblePosts.length >= inlineRecommendationIndex && (
              <ErrorBoundary variant="section" title="Recommendations could not be rendered." showReload={false}>
                <UserRecommendations recommendations={recommendations} variant="slider" />
              </ErrorBoundary>
            )}
            {hasHiddenLoadedPosts ? (
              <div className="home-feed-exact__sentinel">
                <button
                  type="button"
                  onClick={() => setVisiblePostCount((current) => Math.min(readyPosts.length, current + FEED_RENDER_BATCH_SIZE))}
                >
                  Show more posts
                </button>
              </div>
            ) : hasMore && (
              <div className="home-feed-exact__sentinel">
                <button type="button" onClick={loadMore} disabled={isFetching}>Load more</button>
              </div>
            )}
            {!hasHiddenLoadedPosts && !hasMore && !isFetching && pendingUploads.length === 0 && <p className="home-feed-exact__caught-up">You're all caught up</p>}
          </>
        )}
        {isFetching && !isLoading && <LoadingSpinner className="home-feed-exact__loader" label="Loading more posts" />}
      </main>

      {hasRecommendations && (
        <div className="home-feed-exact__rail">
          <ErrorBoundary variant="section" title="Recommendations could not be rendered." showReload={false}>
            <UserRecommendations recommendations={recommendations} variant="rail" />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
};

export default FeedPage;

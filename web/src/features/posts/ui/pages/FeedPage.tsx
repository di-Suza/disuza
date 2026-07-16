import { Eye, Loader2, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useGetUserRecommendationsQuery } from '@/features/users/api/user.api';
import type { UserProfile } from '@/features/users/model/user.types';
import type { PostAuthor } from '@/features/posts/model/post.types';
import InlinePostComposer from '../components/InlinePostComposer';
import PostCard from '../components/PostCard';
import { useFeedPage } from './useFeedPage';
import '../posts.css';
import '@/app/layouts/ProductShell.css';

const PostCardSkeleton = () => (
  <div className="feed-post-skeleton">
    <div className="feed-post-skeleton__header"><span /><div><i /><i /></div><em /></div>
    <div className="feed-post-skeleton__media" />
    <div className="feed-post-skeleton__actions">{[0, 1, 2, 3].map((item) => <span key={item} />)}</div>
    <div className="feed-post-skeleton__copy"><span /><span /></div>
  </div>
);

const RecommendationCard = ({ user }: { user: UserProfile }) => {
  const navigate = useNavigate();
  const avatarUrl = typeof user.profilePicture?.url === 'string' ? user.profilePicture.url : '';

  return (
    <button type="button" onClick={() => navigate(`/profile/${user._id}`)} className="recommendation-slider-card">
      <span className="recommendation-slider-card__avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={22} aria-hidden="true" />}</span>
      <span className="recommendation-slider-card__copy"><strong>{user.userName}</strong>{user.headline && <small>{user.headline}</small>}</span>
      <em><Eye size={14} aria-hidden="true" />View</em>
    </button>
  );
};

const UserRecommendations = ({ recommendations, variant = 'rail' }: { recommendations: UserProfile[]; variant?: 'rail' | 'slider' }) => {
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
              <span>{avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={18} aria-hidden="true" />}</span>
              <span><strong>{item.userName}</strong><small>{item.headline || 'DevLoopFeed member'}</small></span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

const FeedPage = () => {
  const [recommendationInsertIndex] = useState(() => Math.floor(Math.random() * 3) + 2);
  const { feedType, isError, isFetching, isLoading, posts, refetch, user } = useFeedPage();
  const { data: recommendationsData } = useGetUserRecommendationsQuery({ limit: 12 });
  const recommendations = recommendationsData?.recommendations || [];
  const hasRecommendations = recommendations.length > 0;
  const inlineRecommendationIndex = posts.length >= 2 ? Math.min(recommendationInsertIndex, posts.length) : null;

  const fallbackAuthor = useMemo<PostAuthor | undefined>(() => {
    if (!user) return undefined;
    return { _id: user._id, userName: user.userName, profilePicture: user.profilePicture, headline: user.headline };
  }, [user]);

  return (
    <div className={hasRecommendations ? 'home-feed-exact has-recommendations' : 'home-feed-exact'}>
      <main className="home-feed-exact__main">
        <InlinePostComposer />
        {isLoading ? (
          <><PostCardSkeleton /><PostCardSkeleton /></>
        ) : isError ? (
          <div className="post-empty-state"><RefreshCw size={24} aria-hidden="true" /><p>Feed could not be loaded.</p><button type="button" onClick={() => refetch()}>Retry</button></div>
        ) : posts.length === 0 ? (
          <p className="home-feed-exact__empty">{feedType === 'following' ? 'No posts from people you follow yet' : 'No posts yet'}</p>
        ) : (
          <>
            {posts.map((post, index) => (
              <Fragment key={post._id}>
                <PostCard post={post} viewerId={user?._id} fallbackAuthor={fallbackAuthor} />
                {hasRecommendations && inlineRecommendationIndex === index + 1 && <UserRecommendations recommendations={recommendations} variant="slider" />}
              </Fragment>
            ))}
            {!isFetching && <p className="home-feed-exact__caught-up">You're all caught up</p>}
          </>
        )}
        {isFetching && !isLoading && <div className="home-feed-exact__loader"><Loader2 className="spin" size={20} />Loading more posts...</div>}
      </main>

      {hasRecommendations && <div className="home-feed-exact__rail"><UserRecommendations recommendations={recommendations} variant="rail" /></div>}
    </div>
  );
};

export default FeedPage;
